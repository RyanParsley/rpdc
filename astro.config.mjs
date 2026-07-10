import { defineConfig, passthroughImageService, envField } from "astro/config";
import mdx from "@astrojs/mdx";
import mermaid from "astro-mermaid";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";
import posseIntegration from "./src/integrations/posse";

export default defineConfig({
	site: "https://ryanparsley.com",
	env: {
		schema: {
			WEBMENTION_IO_TOKEN: envField.string({
				context: "server",
				access: "secret",
				optional: true,
			}),
		},
	},
	image: {
		service: passthroughImageService(),
	},
	vite: {
		css: {
			preprocessorOptions: {
				scss: {
					api: "modern-compiler",
				},
			},
		},
	},
	build: {
		format: "directory",
	},
	integrations: [
		mermaid({ theme: "dark" }),
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
