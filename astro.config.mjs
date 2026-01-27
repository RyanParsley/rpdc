import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import remarkMermaid from "remark-mermaidjs";
import pagefind from "astro-pagefind";
import posseIntegration from "./src/integrations/posse";

export default defineConfig({
	experimental: {
		assets: true,
	},
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
		format: "directory",
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
			mastodon:
				process.env.MASTODON_ACCESS_TOKEN && process.env.MASTODON_INSTANCE
					? {
							token: process.env.MASTODON_ACCESS_TOKEN,
							instance: process.env.MASTODON_INSTANCE,
						}
					: undefined,
			bluesky:
				process.env.BLUESKY_USERNAME && process.env.BLUESKY_PASSWORD
					? {
							username: process.env.BLUESKY_USERNAME,
							password: process.env.BLUESKY_PASSWORD,
						}
					: undefined,
			dryRun: process.env.SYNDICATION_DRY_RUN === "true",
			maxPosts: 2,
		}),
	],
});
