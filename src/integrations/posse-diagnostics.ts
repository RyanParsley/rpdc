// POSSE build diagnostics.
//
// These counts used to live in `.cloudcannon/postbuild`, a shell script that no
// tool inspected (it carried a second `#!/bin/bash` on line 3, inert because it
// is not the first line). #291 / MG-011 moves the diagnostics into the
// integration that produces the data, which is what the "build-time features are
// Astro integrations, not standalone scripts" policy in `AGENTS.md` asks for.
//
// Scope: this reads the content tree and logs. It does not touch the
// syndication orchestration in `posse.ts`.
//
// Two deliberate differences from the shell, both in the direction of the number
// meaning what it says:
//
//   - `grep -r "syndication:"` counted *lines* containing the key, so a
//     `syndication: []` frontmatter counted as syndicated. Here the frontmatter
//     is parsed and only a non-empty list counts.
//   - `find -mtime -1` measured checkout time on any machine that cloned the
//     repo a minute ago, which is every CI runner: all 37 ephemera files read as
//     "written in the last 24h". Recency now comes from the post's own `date`,
//     the same signal `posse.ts` uses for its legacy cutoff. This is the
//     shallow-checkout lesson from `scripts/lint-prose.js` applied to counts.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

import type { Logger } from "../types/logger";

/** How new a post must be to count as "just published". */
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface SyndicationCounts {
	/** Markdown files in the ephemera tree. */
	total: number;
	/** Files whose frontmatter carries at least one syndication link. */
	syndicated: number;
	/** Files dated inside `RECENT_WINDOW_MS` of `now`. */
	recent: number;
}

/**
 * The ephemera content directory the POSSE integration scans. Single source for
 * the path, so the diagnostics cannot drift from the syndication scan.
 */
export function ephemeraContentDir(cwd: string = process.cwd()): string {
	return join(cwd, "src", "content", "ephemera");
}

function markdownFilesUnder(dir: string): string[] {
	const found: string[] = [];

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			found.push(...markdownFilesUnder(full));
		} else if (entry.name.endsWith(".md")) {
			found.push(full);
		}
	}

	return found;
}

/** Epoch ms of a frontmatter `date`, tolerant of Date, ISO string, and epoch. */
function postTime(date: unknown): number | null {
	if (date instanceof Date) {
		return date.getTime();
	}
	if (typeof date === "number") {
		return date;
	}
	if (typeof date === "string") {
		const parsed = Date.parse(date);
		return Number.isNaN(parsed) ? null : parsed;
	}
	return null;
}

interface EphemeraFlags {
	linked: boolean;
	recent: boolean;
}

function inspect(file: string, cutoff: number): EphemeraFlags {
	try {
		const { data } = matter(readFileSync(file, "utf-8"));
		const time = postTime(data.date);
		return {
			linked: Array.isArray(data.syndication) && data.syndication.length > 0,
			recent: time !== null && time > cutoff,
		};
	} catch {
		// A post whose frontmatter cannot be parsed counts as neither linked nor
		// recent, rather than being reported as "unreadable": gray-matter caches
		// parses by raw string, and re-parsing a string that already threw returns
		// empty data instead of throwing again. A parse-failure count would then
		// depend on read order - a number that quietly means something else.
		return { linked: false, recent: false };
	}
}

/**
 * Counts ephemera files, how many carry syndication links, and how many are
 * dated in the last 24 hours. Returns `null` when the directory is absent.
 */
export function countSyndication(
	dir: string,
	now: Date = new Date(),
): SyndicationCounts | null {
	if (!existsSync(dir)) {
		return null;
	}

	const cutoff = now.getTime() - RECENT_WINDOW_MS;
	const flags = markdownFilesUnder(dir).map((file) => inspect(file, cutoff));

	return {
		total: flags.length,
		syndicated: flags.filter(({ linked }) => linked).length,
		recent: flags.filter(({ recent }) => recent).length,
	};
}

/**
 * Logs the syndication counts through the injected `Logger`. Called from
 * `astro:build:done` after the syndication pass, which is where the deleted
 * postbuild hook used to run.
 */
export function reportSyndicationDiagnostics(
	logger: Logger,
	dir: string = ephemeraContentDir(),
	now: Date = new Date(),
): void {
	try {
		const counts = countSyndication(dir, now);

		if (counts === null) {
			logger.info(`POSSE: No ephemera directory to report on: ${dir}`);
			return;
		}

		logger.info(
			`POSSE: Ephemera diagnostics - ${counts.syndicated} of ${counts.total} ` +
				`files carry syndication links, ${counts.recent} dated in the last 24h`,
		);

		if (counts.syndicated === 0 && counts.recent > 0) {
			logger.warn(
				"POSSE: Recent ephemera files exist but none carry syndication links; " +
					"the syndication pass may not have completed",
			);
		} else if (counts.syndicated === 0 && counts.recent === 0) {
			logger.info("POSSE: No recent ephemera posts to syndicate");
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(`POSSE: Syndication diagnostics unavailable: ${message}`);
	}
}
