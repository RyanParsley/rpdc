/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		exclude: ["node_modules", "dist", ".astro", ".cloudcannon"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
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
