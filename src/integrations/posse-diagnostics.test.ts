import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	countSyndication,
	ephemeraContentDir,
	reportSyndicationDiagnostics,
} from "./posse-diagnostics";

// `src/test/setup.ts` stubs `gray-matter` globally so the POSSE orchestration
// tests can drive it. These tests count real frontmatter in real files, so the
// module is pointed back at its actual implementation - the same per-file
// `vi.mock` override `posse.test.ts` uses for its own stub.
vi.mock("gray-matter", async (importOriginal) => importOriginal());

const fakeLogger = () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
});

/** Fixed clock: every fixture date below is relative to this. */
const NOW = new Date("2026-10-25T12:00:00.000Z");
const FRESH = "2026-10-25T05:00:00.000Z"; // 7h before NOW
const STALE = "2026-10-20T05:00:00.000Z"; // 5 days before NOW

const LINKED = "  - href: https://mastodon.social/@r/1\n    title: Mastodon";

let tempDir = "";

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), "posse-diagnostics-"));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

/** Writes one ephemera post and returns its path. */
const writePost = (
	name: string,
	{
		syndication = "",
		date = STALE,
	}: { syndication?: string; date?: string | null } = {},
	dir = tempDir,
): string => {
	const frontmatter =
		date === null
			? "---\ntitle: Test\nsyndication:\n"
			: `---\ndate: ${date}\ntitle: Test\nsyndication:\n`;
	const file = join(dir, name);
	writeFileSync(file, `${frontmatter}${syndication}\n---\n\nBody\n`);
	return file;
};

describe("ephemeraContentDir", () => {
	it("is the path the POSSE scan uses", () => {
		expect(ephemeraContentDir("/site")).toBe(
			join("/site", "src", "content", "ephemera"),
		);
	});

	it("defaults to the working directory", () => {
		expect(ephemeraContentDir()).toBe(
			join(process.cwd(), "src", "content", "ephemera"),
		);
	});
});

describe("countSyndication", () => {
	it("returns null when the directory does not exist", () => {
		expect(countSyndication(join(tempDir, "nope"), NOW)).toBeNull();
	});

	it("counts files with at least one syndication link", () => {
		writePost("a.md", { syndication: LINKED });
		writePost("b.md");

		expect(countSyndication(tempDir, NOW)).toEqual({
			total: 2,
			syndicated: 1,
			recent: 0,
		});
	});

	it("does not count an empty syndication list", () => {
		// The shell hook grepped for the literal `syndication:` and counted this.
		writePost("a.md", { syndication: "  []" });

		expect(countSyndication(tempDir, NOW)).toEqual({
			total: 1,
			syndicated: 0,
			recent: 0,
		});
	});

	it("takes recency from the post date, not the file mtime", () => {
		// A fresh checkout rewrites every mtime, which made `find -mtime -1` report
		// all 37 ephemera files as written in the last day on CI.
		writePost("fresh.md", { date: FRESH, syndication: LINKED });
		writePost("stale.md", { date: STALE, syndication: LINKED });

		expect(countSyndication(tempDir, NOW)).toEqual({
			total: 2,
			syndicated: 2,
			recent: 1,
		});
	});

	it("reads a yaml timestamp the same as an ISO string", () => {
		// Unquoted dates arrive from gray-matter as Date objects.
		writePost("a.md", { date: "2026-10-25 05:00:00", syndication: LINKED });

		expect(countSyndication(tempDir, NOW)?.recent).toBe(1);
	});

	it("treats a post with no date as not recent", () => {
		writePost("a.md", { date: null, syndication: LINKED });

		expect(countSyndication(tempDir, NOW)).toEqual({
			total: 1,
			syndicated: 1,
			recent: 0,
		});
	});

	it("counts a post it cannot parse in the total rather than throwing", () => {
		writeFileSync(join(tempDir, "broken.md"), "---\n\t- unbalanced: [\n---\n");

		expect(countSyndication(tempDir, NOW)).toEqual({
			total: 1,
			syndicated: 0,
			recent: 0,
		});
	});

	it("walks the dated subdirectories the content collection uses", () => {
		const nested = join(tempDir, "2026", "10", "25");
		mkdirSync(nested, { recursive: true });
		writePost("post.md", { date: FRESH, syndication: LINKED }, nested);

		expect(countSyndication(tempDir, NOW)).toEqual({
			total: 1,
			syndicated: 1,
			recent: 1,
		});
	});
});

describe("reportSyndicationDiagnostics", () => {
	it("logs the counts through the injected logger", () => {
		writePost("a.md", { date: FRESH, syndication: LINKED });
		const logger = fakeLogger();

		reportSyndicationDiagnostics(logger, tempDir, NOW);

		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining(
				"1 of 1 files carry syndication links, 1 dated in the last 24h",
			),
		);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it("warns when recent posts carry no links, which is a failed pass", () => {
		writePost("a.md", { date: FRESH });
		const logger = fakeLogger();

		reportSyndicationDiagnostics(logger, tempDir, NOW);

		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining("may not have completed"),
		);
	});

	it("reports nothing recent as an ordinary build, not a warning", () => {
		writePost("a.md", { date: STALE });
		const logger = fakeLogger();

		reportSyndicationDiagnostics(logger, tempDir, NOW);

		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining("No recent ephemera posts"),
		);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it("says so when there is no ephemera directory", () => {
		const logger = fakeLogger();
		const missing = join(tempDir, "absent");

		reportSyndicationDiagnostics(logger, missing, NOW);

		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining(`No ephemera directory to report on: ${missing}`),
		);
	});

	it("downgrades a read failure to a warning instead of failing the build", () => {
		const logger = fakeLogger();
		const aFile = writePost("a.md");

		reportSyndicationDiagnostics(logger, aFile, NOW);

		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining("Syndication diagnostics unavailable"),
		);
	});
});
