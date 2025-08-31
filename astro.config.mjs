import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import remarkMermaid from "remark-mermaidjs";
import pagefind from "astro-pagefind";
import posseIntegration from "./src/integrations/posse";

export default defineConfig({
	site: "https://ryanparsley.com",
	vite: {
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
		posseIntegration({
			dryRun: true, // Enable dry-run for testing
			maxPosts: 2,
		}),
	],
});
