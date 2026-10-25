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
		// #287: a non-null assertion is a claim that the compiler cannot check, and
		// `no-non-null-assertion` is not in `tseslint.configs.recommended`, so
		// nothing in the gate caught a stray `!`. The 4 production sites are fixed
		// by narrowing (`src/integrations/posse.ts`, `posse-bluesky.ts`) or by
		// deleting an assertion the type already satisfies
		// (`src/integrations/posse-mastodon.ts`), not by moving the `!` somewhere
		// else. ADR 9 rule 5 calls this "delete restatements".
		files: ["src/**/*.{ts,astro}"],
		rules: {
			"@typescript-eslint/no-non-null-assertion": "error",
		},
	},
	{
		// Tests and their mocks keep assertions, deliberately: `noUncheckedIndexedAccess`
		// is on under `astro/tsconfigs/strictest`, so every `arr[0]` in a fixture comes
		// back as `T | undefined` and needs a claim about the fixture's own shape. All
		// 13 measured hits are that shape (`mediaRequests[0]!`, `result[0]!`,
		// `body.media_ids[0]!`). Gating them would push `if (!x) throw` boilerplate into
		// assertions that already fail loudly through `expect`. Same "error prod, off
		// tests" scope the audit records for `prefer-optional-chain` and the boundary
		// return-type gate, and it is a `files` override rather than 13 inline
		// `eslint-disable` comments, which the repo has none of.
		files: ["src/**/*.test.ts", "src/test/**"],
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
		},
	},
	// Must stay last: turns off every ESLint rule that disagrees with Prettier,
	// so formatting has exactly one authority (ADR 3).
	prettierConfig,
];
