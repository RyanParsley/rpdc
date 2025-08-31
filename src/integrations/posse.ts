import type { AstroIntegration } from "astro";

interface PosseOptions {
	mastodon?: {
		token: string;
		instance: string;
	};
	bluesky?: {
		username: string;
		password: string;
	};
	dryRun?: boolean;
	maxPosts?: number;
}

export default function posseIntegration(
	options: PosseOptions = {},
): AstroIntegration {
	const { mastodon, bluesky, dryRun = false, maxPosts = 3 } = options;

	return {
		name: "posse-syndication",
		hooks: {
			"astro:build:done": async ({ logger }) => {
				logger.info("POSSE: Astro integration loaded");

				if (dryRun) {
					logger.info("POSSE: Running in dry-run mode - no actual posting");
				}

				// Configuration check
				logger.info(
					`POSSE: Would syndicate up to ${maxPosts} recent ephemera posts`,
				);
				logger.info(`POSSE: Mastodon configured: ${!!mastodon}`);
				logger.info(`POSSE: Bluesky configured: ${!!bluesky}`);

				if (mastodon || bluesky) {
					logger.info("POSSE: Ready to syndicate to configured platforms");
					logger.info(
						"POSSE: Integration pattern established - actual syndication logic would integrate here",
					);
				} else {
					logger.warn(
						"POSSE: No platforms configured - add mastodon/bluesky credentials to enable syndication",
					);
				}
			},
		},
	};
}
