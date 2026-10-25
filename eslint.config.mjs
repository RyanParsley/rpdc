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
	{
		// AGENTS.md: no relative imports beyond `../`. Filed as #284. A specifier that
		// climbs two levels usually means there is no alias to reach what the file
		// needs - `src/pages/**` grew six `../../../content.config` imports for
		// exactly that reason, because `@/*` lived only in the Vitest config until
		// #283 put it in tsconfig. `patterns` rather than `paths`, because `**` has to
		// match the tail of the specifier, not just its directory.
		// Scope note: ESLint reads `ts`, `astro` and `js` here. It has no MDX parser,
		// so a deep relative import inside `src/content/**.mdx` is invisible to this
		// rule; the one such import is rewritten by hand in the same change.
		files: ["src/**/*.{ts,astro,js}"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["../../**"],
							message:
								"Use a path alias from tsconfig.json (ADR 4) instead of a relative path that climbs two or more levels.",
						},
					],
				},
			],
		},
	},
	// Must stay last: turns off every ESLint rule that disagrees with Prettier,
	// so formatting has exactly one authority (ADR 3).
	prettierConfig,
];
