import eslintPluginAstro from "eslint-plugin-astro";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

import parser from "astro-eslint-parser";

export default [
	{
		ignores: ["src/env.d.ts"],
	},
	eslint.configs.recommended,
	...eslintPluginAstro.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.astro"],

		languageOptions: {
			parser: parser,
			ecmaVersion: 5,
			sourceType: "script",

			parserOptions: {
				parser: "@typescript-eslint/parser",
				extraFileExtensions: [".astro"],
			},
		},

		rules: {},
	},
];
