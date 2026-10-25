#!/usr/bin/env node
/**
 * Prose lint scoper.
 *
 * Vale runs against writing from the current year and against the repo's own
 * documentation. Anything older than this year is history and stays exactly as
 * it was written, so this script decides *which files* Vale sees rather than
 * changing any style rule.
 *
 * The cutoff is derived from the clock, not hard-coded: a post written next
 * January is gated without anyone editing this file.
 *
 * Date resolution, first match wins:
 *   1. frontmatter `date` (Date, ISO string, or epoch number after transform)
 *   2. a 4-digit year in the path, at a segment boundary (so `gp2040ce.md` is
 *      not read as the year 2040)
 *   3. the date git first added the file
 *
 * The git fallback matters: `src/content/note/local-llm-speed/index.md` has no
 * frontmatter date and no year in its path, but it was added this year, so it is
 * current writing and belongs in the gate.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CUTOFF_YEAR = new Date().getFullYear();

// Repository documentation is never "history": it describes the code as it is.
const ALWAYS = ["README.md", "AGENTS.md", "agents", "docs"];

const CONTENT_DIR = "src/content";

function walk(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else if (entry.name.endsWith(".md")) out.push(full);
	}
	return out;
}

function fromFrontmatter(file) {
	try {
		const { data } = matter(readFileSync(file, "utf8"));
		const raw = data.date;
		if (raw instanceof Date) return raw.getFullYear();
		if (typeof raw === "number") return new Date(raw).getFullYear();
		if (typeof raw === "string") {
			const m = raw.match(/^(\d{4})/);
			if (m) return Number(m[1]);
		}
	} catch {
		return null;
	}
	return null;
}

function fromPath(file) {
	// Year must sit at a boundary: start of a segment, or delimited by - / . _
	for (const m of file.matchAll(/(?:^|[/._-])(\d{4})(?:[/._-]|\b)/g)) {
		const year = Number(m[1]);
		if (year >= 1990 && year <= CUTOFF_YEAR + 1) return year;
	}
	return null;
}

function fromGit(file) {
	const res = spawnSync(
		"git",
		["log", "--diff-filter=A", "--format=%ad", "--date=format:%Y", "--", file],
		{ encoding: "utf8" },
	);
	if (res.status !== 0) return null;
	const lines = res.stdout.trim().split("\n").filter(Boolean);
	if (lines.length === 0) return null;
	const year = Number(lines[lines.length - 1]);
	return Number.isFinite(year) && year > 1990 ? year : null;
}

function resolveYear(file) {
	return fromFrontmatter(file) ?? fromPath(file) ?? fromGit(file);
}

function shallowRepo() {
	const res = spawnSync("git", ["rev-parse", "--is-shallow-repository"], {
		encoding: "utf8",
	});
	return res.status === 0 && res.stdout.trim() === "true";
}

if (shallowRepo()) {
	console.error(
		"git history is shallow, so a post's add-date cannot be read and every file " +
			"would look added today. That widens this gate to content that is meant to " +
			"be treated as history.\n" +
			"Fix the checkout: fetch-depth: 0 (see .github/workflows/build.yml).",
	);
	process.exit(2);
}

function docsFiles() {
	const out = [];
	for (const entry of ALWAYS) {
		if (!statSync(entry, { throwIfNoEntry: false })) continue;
		if (statSync(entry).isDirectory()) walk(entry, out);
		else out.push(entry);
	}
	return out;
}

const gated = [...docsFiles()];
const skipped = [];
const undated = [];

for (const file of walk(CONTENT_DIR)) {
	const rel = file;
	const year = resolveYear(rel);
	if (year === null) {
		undated.push(rel);
		skipped.push(rel);
		continue;
	}
	if (year >= CUTOFF_YEAR) gated.push(rel);
	else skipped.push(rel);
}

console.log(
	`prose gate: ${gated.length} files, cutoff year ${CUTOFF_YEAR}, ` +
		`${skipped.length} skipped as history`,
);

if (undated.length > 0) {
	console.log(
		`  warning: ${undated.length} file(s) with no resolvable date (treated as history):`,
	);
	for (const f of undated) console.log(`    ${f}`);
}

if (process.env.PROSE_SCOPE === "list") {
	for (const f of gated) console.log(f);
	process.exit(0);
}

if (gated.length === 0) {
	console.log("nothing to lint");
	process.exit(0);
}

const result = spawnSync(
	"vale",
	["--output=JSON", "--minAlertLevel=warning", ...gated],
	{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);

if (result.error?.code === "ENOENT") {
	console.error(
		"vale not found. Install it (https://vale.sh) or run the prose check in CI.",
	);
	process.exit(127);
}

/**
 * Vale exits non-zero only for errors; warnings never fail the process, and the
 * CLI has no "fail on any alert" flag. So the exit code is decided here from the
 * parsed alerts, or warnings would be display-only and the gate would be a
 * report (found in CI on 2026-10-14: "0 errors, 1 warning" passed green).
 *
 * JSON keys are capitalized (`Severity`, `Check`, `Message`). An alert without a
 * recognizable Severity is treated as a tool failure rather than silently
 * counted as passing, because misreading these keys is how a first measurement
 * of this repo reported 0 errors when there were 54.
 */
let alerts;
try {
	alerts = JSON.parse(result.stdout || "{}");
} catch {
	console.error("could not parse vale JSON output");
	console.error(result.stderr || result.stdout || "(no output)");
	process.exit(2);
}

const KNOWN = new Set(["error", "warning", "suggestion"]);
let errors = 0;
let warnings = 0;

for (const [file, messages] of Object.entries(alerts)) {
	for (const alert of messages) {
		const severity = String(alert.Severity ?? "").toLowerCase();
		if (!KNOWN.has(severity)) {
			console.error(
				`unexpected vale severity ${JSON.stringify(alert.Severity)} from ${JSON.stringify(alert.Check)}; refusing to guess`,
			);
			process.exit(2);
		}
		if (severity === "suggestion") continue;
		if (severity === "error") errors++;
		else warnings++;
		console.error(
			`${file}:${alert.Line ?? 0}  ${severity}  ${alert.Message ?? ""}  (${alert.Check ?? "?"})`,
		);
	}
}

if (errors + warnings > 0) {
	console.error(`prose gate failed: ${errors} errors, ${warnings} warnings`);
	process.exit(1);
}

process.exit(0);
