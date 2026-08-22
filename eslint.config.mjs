import eslintPluginAstro from "eslint-plugin-astro";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

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
];
