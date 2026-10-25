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
		// ADR 9: explicit return types at module boundaries, inferred inside.
		// Scoped by directory because no option on this rule sees export status -
		// `allowedNames` matches function names, verified against
		// @typescript-eslint 8.71. These globs are where an export is a contract
		// another module compiles against. Filed as #288.
		//
		// Three exemptions, each deliberate, none left as silence:
		//   1. `.astro` files and `src/pages|components|layouts/**` are out of
		//      scope. `getStaticPaths`, component props and integration hook
		//      callbacks take their signature from Astro; restating one copies a
		//      contract the framework owns, and the copy drifts (ADR 9 rule 2). The
		//      3 measured `.astro` frontmatter helpers (`getFullPath`, `tagCount`,
		//      `formatDate`) are closures, inferred at the call site (rule 3).
		//   2. `allowExpressions` / `allowTypedFunctionExpressions` keep callback
		//      literals and `const f: SomeFnType = () => {}` from needing an
		//      annotation - the same call-site inference argument.
		//   3. `*.test.ts` under these directories is turned off below. The rule
		//      cannot tell an exported boundary arrow from a test-local mock of the
		//      same shape, and all 10 measured test hits are the latter: `fakeLogger`,
		//      `runSetup`, `mockEphemeraFile`, `jsonFetch`, `statusCall`,
		//      `createRecordCall`, `mockExtractLinks` x4. Annotating those restates a
		//      type no caller depends on, so the exemption is recorded here rather
		//      than paid for in 10 inline disables.
		files: [
			"src/integrations/**/*.ts",
			"src/utils/**/*.ts",
			"src/types/**/*.ts",
		],
		rules: {
			"@typescript-eslint/explicit-function-return-type": [
				"error",
				{
					allowExpressions: true,
					allowTypedFunctionExpressions: true,
				},
			],
		},
	},
	{
		// Companion to exemption 3 above; the counts it hides are listed there.
		files: [
			"src/integrations/**/*.test.ts",
			"src/utils/**/*.test.ts",
			"src/types/**/*.test.ts",
		],
		rules: {
			"@typescript-eslint/explicit-function-return-type": "off",
		},
	},
	// Must stay last: turns off every ESLint rule that disagrees with Prettier,
	// so formatting has exactly one authority (ADR 3).
	prettierConfig,
];
