/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { resolve } from "path";
import tsconfig from "./tsconfig.json";

// ADR 4, #283: `tsconfig.json` `compilerOptions.paths` is the single source of
// truth for import aliases. Astro resolves those itself
// (`resolve.tsconfigPaths: true` in astro/dist/core/create-vite.js), but Vite
// needs them as `resolve.alias`, and restating the list is what let the two
// drift in both directions: `@utils/*` and `@integrations/*` were Vitest-only, so
// the first page to use one got a passing test and a failing build; `@data/*` was
// tsconfig-only, so `@data/navigation.yml` resolved for Astro and failed in a
// test. Deriving here means an alias is one edit, in one file, and
// `vitest.config.test.ts` proves the two agree.
//
// `@data/*` stays: `data/navigation.yml` exists and is managed by CloudCannon
// (`cloudcannon.config.yml` `data_config`); it simply has no importer yet. The
// parity test checks each target directory exists, so the alias cannot rot into a
// claim about a path that is gone.
//
// Aliases are expected as `"@name/*": ["dir/*"]`. Anything else throws at config
// load rather than resolving wrongly, because a silently missing alias is the bug
// this function exists to prevent.
export interface Alias {
	find: string;
	replacement: string;
}

export function aliasesFromTsconfig(): Alias[] {
	const baseUrl = tsconfig.compilerOptions.baseUrl ?? ".";
	const paths = tsconfig.compilerOptions.paths ?? {};

	return (
		Object.entries(paths)
			.map(([key, target]) => {
				if (!key.endsWith("/*")) {
					throw new Error(`tsconfig alias "${key}" must end in "/*"`);
				}
				if (target.length !== 1 || !target[0]?.endsWith("/*")) {
					throw new Error(
						`tsconfig alias "${key}" must map to exactly one ["dir/*"] target`,
					);
				}

				return {
					// Keep the trailing slash: it is what makes the prefix match specific.
					find: key.slice(0, -1),
					replacement: resolve(baseUrl, target[0].slice(0, -2)) + "/",
				};
			})
			// Longest prefix first, so `@components/` wins over `@/`. Vite takes the
			// first matching entry.
			.sort((a, b) => b.find.length - a.find.length)
	);
}

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		include: [
			"src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx,astro}",
			"scripts/**/*.test.js",
			// Root-level so the config guard below can live next to the config it
			// protects.
			"vitest.config.test.ts",
		],
		exclude: ["node_modules", "dist", ".astro", ".cloudcannon"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			// Ratchet: 80% is the target agreed in #252. Coverage currently sits
			// near 96% statements / 88% branches, so this gates regressions with
			// headroom. Raise toward 100% as the remaining error paths land.
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
			exclude: [
				"node_modules/",
				"dist/",
				".astro/",
				"src/test/",
				"**/*.d.ts",
				"**/*.config.{js,ts}",
				"astro.config.mjs",
			],
		},
	},
	resolve: {
		alias: aliasesFromTsconfig(),
	},
});
