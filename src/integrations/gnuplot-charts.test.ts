import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { AstroIntegration } from "astro";
import { describe, it, expect, vi, afterEach } from "vitest";

import gnuplotCharts, { findChartScripts } from "./gnuplot-charts";

const hasGnuplot = (() => {
	try {
		execFileSync("gnuplot", ["--version"]);
		return true;
	} catch {
		return false;
	}
})();

type SetupHook = NonNullable<AstroIntegration["hooks"]["astro:config:setup"]>;
type SetupParams = Parameters<SetupHook>[0];

const fakeLogger = () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
});

const runSetup = async (contentDir: string) => {
	const logger = fakeLogger();
	const hook = gnuplotCharts({ contentDir }).hooks?.["astro:config:setup"];
	if (!hook) {
		throw new Error("gnuplot-charts registered no astro:config:setup hook");
	}
	await hook({
		config: { root: pathToFileURL(contentDir) },
		logger,
	} as unknown as SetupParams);
	return logger;
};

let tempDir = "";

const makeTempContent = (): string => {
	tempDir = mkdtempSync(join(tmpdir(), "gnuplot-charts-"));
	return tempDir;
};

afterEach(() => {
	if (tempDir) {
		rmSync(tempDir, { recursive: true, force: true });
		tempDir = "";
	}
});

describe("findChartScripts", () => {
	it("collects nested .gnuplot recipes sorted, ignoring other files", () => {
		const root = makeTempContent();
		mkdirSync(join(root, "note", "a", "scripts"), { recursive: true });
		mkdirSync(join(root, "note", "b"), { recursive: true });
		writeFileSync(join(root, "note", "a", "scripts", "z.gnuplot"), "");
		writeFileSync(join(root, "note", "b", "m.gnuplot"), "");
		writeFileSync(join(root, "note", "b", "index.md"), "");
		writeFileSync(join(root, "note", "a", "gnuplot.txt"), "");

		expect(findChartScripts(root)).toEqual([
			join(root, "note", "a", "scripts", "z.gnuplot"),
			join(root, "note", "b", "m.gnuplot"),
		]);
	});

	it("returns an empty list for a missing directory", () => {
		expect(findChartScripts(join(tmpdir(), "does-not-exist-xyz"))).toEqual([]);
	});
});

describe("astro:config:setup hook", () => {
	it(
		"renders each recipe from its own directory",
		{ skip: !hasGnuplot },
		async () => {
			const root = makeTempContent();
			const scripts = join(root, "note", "speed", "scripts");
			const assets = join(root, "note", "speed", "assets");
			mkdirSync(scripts, { recursive: true });
			mkdirSync(assets, { recursive: true });
			writeFileSync(
				join(scripts, "chart.gnuplot"),
				'set terminal pngcairo size 10,10\nset output "../assets/out.png"\nplot x\n',
			);

			const logger = await runSetup(root);

			expect(existsSync(join(assets, "out.png"))).toBe(true);
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining("chart.gnuplot"),
			);
		},
	);

	it(
		"fails the build when a recipe errors",
		{ skip: !hasGnuplot },
		async () => {
			const root = makeTempContent();
			mkdirSync(join(root, "note"), { recursive: true });
			writeFileSync(
				join(root, "note", "broken.gnuplot"),
				"not valid gnuplot\n",
			);

			await expect(runSetup(root)).rejects.toThrow(/gnuplot failed/);
		},
	);

	it("warns and keeps the committed PNGs when gnuplot is absent", async () => {
		const root = makeTempContent();
		mkdirSync(join(root, "note"), { recursive: true });
		writeFileSync(join(root, "note", "chart.gnuplot"), "plot x\n");

		const originalPath = process.env.PATH;
		process.env.PATH = "/nonexistent";
		try {
			const logger = await runSetup(root);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining("gnuplot not found"),
			);
		} finally {
			process.env.PATH = originalPath;
		}
	});

	it("does nothing when no recipes exist", async () => {
		const root = makeTempContent();
		const logger = await runSetup(root);
		expect(logger.info).not.toHaveBeenCalled();
		expect(logger.debug).toHaveBeenCalled();
	});
});
