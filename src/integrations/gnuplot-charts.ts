// Renders every *.gnuplot chart recipe found under src/content before the
// content collections sync, so markdown image references always resolve
// against assets generated from the current CSV data.
//
// Recipes run with their own directory as cwd and use relative paths
// (../data in, ../assets out), so a note stays self-contained: move the
// folder and its charts move with it.

import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { AstroIntegration, AstroIntegrationLogger } from "astro";

const execFileAsync = promisify(execFile);

export interface GnuplotChartsOptions {
	contentDir?: string;
}

interface ExecError {
	code?: string;
	stderr?: string;
}

const isMissingBinary = (error: unknown): boolean =>
	(error as ExecError | null)?.code === "ENOENT";

const stderrOf = (error: unknown): string =>
	(error as ExecError | null)?.stderr?.trim() || String(error);

export const findChartScripts = (dir: string): string[] => {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}
	return entries
		.flatMap((entry) =>
			entry.isDirectory()
				? findChartScripts(join(dir, entry.name))
				: entry.name.endsWith(".gnuplot")
					? [join(dir, entry.name)]
					: [],
		)
		.sort();
};

const renderChart = async (
	script: string,
	contentRoot: string,
	logger: AstroIntegrationLogger,
): Promise<boolean> => {
	try {
		await execFileAsync("gnuplot", [basename(script)], {
			cwd: dirname(script),
		});
		logger.info(`rendered ${relative(contentRoot, script)}`);
		return true;
	} catch (error) {
		if (isMissingBinary(error)) {
			logger.warn(
				"gnuplot not found on PATH; serving committed chart PNGs instead",
			);
			return false;
		}
		throw new Error(
			`gnuplot failed for ${relative(contentRoot, script)}:\n${stderrOf(error)}`,
			{ cause: error },
		);
	}
};

export default function gnuplotCharts(
	options: GnuplotChartsOptions = {},
): AstroIntegration {
	return {
		name: "gnuplot-charts",
		hooks: {
			"astro:config:setup": async ({ config, logger }) => {
				const contentRoot =
					options.contentDir ??
					join(fileURLToPath(config.root), "src", "content");
				const scripts = findChartScripts(contentRoot);
				if (scripts.length === 0) {
					logger.debug("no .gnuplot recipes found; nothing to render");
					return;
				}
				for (const script of scripts) {
					const keepGoing = await renderChart(script, contentRoot, logger);
					if (!keepGoing) {
						return;
					}
				}
			},
		},
	};
}
