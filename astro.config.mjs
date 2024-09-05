import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import remarkMermaid from "remark-mermaidjs";
import pagefind from "astro-pagefind";

// https://astro.build/config
export default defineConfig({
	site: "https://ryanparsley.com",
	markdown: {
		remarkPlugins: [[remarkMermaid, {mermaidConfig: { theme: 'dark' }}]],
	},
	build: {
    format: "file",
  },
	integrations: [
		mdx(),
		sitemap(),
		partytown({
			// Adds dataLayer.push as a forwarding-event.
			config: {
				forward: ["dataLayer.push"],
			},
		}),
		pagefind()
	],
});
