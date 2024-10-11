import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import remarkMermaid from "remark-mermaidjs";
import pagefind from "astro-pagefind";

export default defineConfig({
	site: "https://ryanparsley.com",
	vite: {
		envPrefix: "MAILCHIMP_",
		css: {
			preprocessorOptions: {
				scss: {
					api: "modern-compiler",
				},
			},
		},
	},
	markdown: {
		remarkPlugins: [[remarkMermaid, { mermaidConfig: { theme: "dark" } }]],
	},
	build: {
		format: "file",
	},
	integrations: [
		mdx(),
		sitemap(),
		partytown({
			config: {
				forward: ["dataLayer.push"],
			},
		}),
		pagefind(),
	],
});
