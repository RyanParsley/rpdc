/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		include: [
			"src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx,astro}",
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
		alias: {
			"@": resolve("./src"),
			"@components": resolve("./src/components"),
			"@layouts": resolve("./src/layouts"),
			"@integrations": resolve("./src/integrations"),
			"@utils": resolve("./src/utils"),
		},
	},
});
