import eslintPluginAstro from "eslint-plugin-astro";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default [
	{
		ignores: ["src/env.d.ts"],
	},
	{
		files: ["scripts/**/*.js"],
		languageOptions: {
			globals: {
				console: "readonly",
				fetch: "readonly",
				process: "readonly",
				URL: "readonly",
			},
		},
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...eslintPluginAstro.configs.recommended,
	{
		// AGENTS.md: `console.*` in application code routes through `Logger`
		// (src/types/logger.ts). CLI output in scripts/ is the point of those
		// files, so they keep console via the globals block above.
		files: ["src/**/*.{ts,astro}"],
		rules: {
			"no-restricted-globals": [
				"error",
				{
					name: "console",
					message: "Use the injected Logger (src/types/logger.ts).",
				},
			],
			"no-var": "error",
			"prefer-const": ["error", { destructuring: "all" }],
		},
	},
	// Must stay last: turns off every ESLint rule that disagrees with Prettier,
	// so formatting has exactly one authority (ADR 3).
	prettierConfig,
];
