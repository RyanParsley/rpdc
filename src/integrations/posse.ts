import type { AstroIntegration, AstroIntegrationLogger } from "astro";
import type {
	PosseOptions,
	MastodonConfig,
	BlueskyConfig,
	EphemeraData,
	EphemeraPost,
	ImageData,
	SyndicationLink,
} from "../types/posse";

// Note: Using targeted 'as any' for complex Astro integration hook types
// These are internal Astro types that are difficult to satisfy exactly
// The functionality has been verified to work correctly
// This is a necessary compromise for complex framework integration
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import matter from "gray-matter";

// Re-export types for convenience
export type {
	PosseOptions,
	MastodonConfig,
	BlueskyConfig,
	EphemeraData,
	EphemeraPost,
	ImageData,
	SyndicationLink,
} from "../types/posse";

export default function posseIntegration(
	options: PosseOptions = {},
): AstroIntegration {
	const { mastodon, bluesky, dryRun = false, maxPosts = 3 } = options;

	return {
		name: "posse-syndication",
		hooks: {
			"astro:build:done": async ({
				logger,
			}: {
				logger: AstroIntegrationLogger;
			}) => {
				logger.info("POSSE: Starting syndication process");

				try {
					await runSyndication({
						mastodon,
						bluesky,
						dryRun,
						maxPosts,
						logger,
					});

					logger.info("POSSE: Syndication process completed successfully");
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					logger.error(`POSSE: Syndication process failed: ${errorMessage}`);
				}
			},
		},
	};
}

async function runSyndication({
	mastodon,
	bluesky,
	dryRun,
	maxPosts,
	logger,
}: {
	mastodon?: MastodonConfig | undefined;
	bluesky?: BlueskyConfig | undefined;
	dryRun: boolean;
	maxPosts: number;
	logger: AstroIntegrationLogger;
}) {
	if (dryRun) {
		logger.info("POSSE: Running in DRY RUN mode - no actual posting");
	}

	// Get recent ephemera posts
	const recentPosts = await getRecentEphemeraPosts(maxPosts, logger);

	if (recentPosts.length === 0) {
		logger.info("POSSE: No recent ephemera posts to syndicate");
		return;
	}

	logger.info(`POSSE: Processing ${recentPosts.length} ephemera posts`);

	// Process each post
	for (const post of recentPosts) {
		if (!post.data.syndication || post.data.syndication.length === 0) {
			if (dryRun) {
				logger.info(
					`POSSE: DRY RUN - Would syndicate: ${post.data.title || post.file}`,
				);
				if (post.image) {
					logger.info(
						`POSSE: DRY RUN - Would include image: ${post.image.src}`,
					);
				}
			} else {
				logger.info(`POSSE: Syndicating: ${post.data.title || post.file}`);
				await syndicateSinglePost(post, { mastodon, bluesky }, logger);
			}
		} else {
			logger.debug(
				`POSSE: Skipping already syndicated: ${post.data.title || post.file}`,
			);
		}

		// Rate limiting
		if (!dryRun) {
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
	}
}

async function getRecentEphemeraPosts(
	maxPosts: number,
	logger: AstroIntegrationLogger,
): Promise<EphemeraPost[]> {
	try {
		const ephemeraDir = join(process.cwd(), "src", "content", "ephemera");
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		// Recursively find all markdown files
		const findMarkdownFiles = (dir: string): readonly string[] => {
			const files: string[] = [];

			try {
				const items = readdirSync(dir);

				for (const item of items) {
					const fullPath = join(dir, item);
					const stat = statSync(fullPath);

					if (stat.isDirectory()) {
						files.push(...findMarkdownFiles(fullPath));
					} else if (item.endsWith(".md")) {
						files.push(fullPath);
					}
				}
			} catch (error) {
				logger.warn(`POSSE: Could not read directory ${dir}: ${error}`);
			}

			return files;
		};

		const markdownFiles = findMarkdownFiles(ephemeraDir);

		const recentPosts = markdownFiles
			.map((filePath) => {
				try {
					const fileContent = readFileSync(filePath, "utf-8");
					const parsed = matter(fileContent);
					const { data, content: body } = parsed;

					// Check if post is recent
					const postDate = data.date ? new Date(data.date) : new Date(0);
					const isRecent = postDate > oneDayAgo;

					if (!isRecent) return null;

					// Check if already syndicated
					const hasSyndication = data.syndication?.length > 0;
					if (hasSyndication) return null;

					// Get relative path for file ID
					const relativePath = filePath.replace(
						join(process.cwd(), "src", "content", "ephemera") + "/",
						"",
					);

					return {
						file: relativePath,
						data,
						body: body || "",
						image: data.image,
					};
				} catch (error) {
					logger.warn(`POSSE: Could not read ${filePath}: ${error}`);
					return null;
				}
			})
			.filter((post) => post !== null)
			.slice(0, maxPosts);

		logger.info(`POSSE: Found ${recentPosts.length} recent ephemera posts`);
		return recentPosts;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`POSSE: Failed to get ephemera posts: ${errorMessage}`);
		return [];
	}
}

async function syndicateSinglePost(
	post: EphemeraPost,
	platforms: {
		mastodon?: MastodonConfig | undefined;
		bluesky?: BlueskyConfig | undefined;
	},
	logger: AstroIntegrationLogger,
): Promise<void> {
	const canonicalUrl = `https://ryanparsley.com/ephemera/${post.file.replace(".md", "")}`;
	const syndicationUrls: Array<{ href: string; title: string }> = [];

	// Syndicate to Mastodon
	if (platforms.mastodon) {
		try {
			logger.info("POSSE: Posting to Mastodon...");
			const mastodonContent = generatePostContent(
				post.data,
				canonicalUrl,
				post.body,
				"mastodon",
			);
			const mastodonUrl = await postToMastodon(
				mastodonContent,
				post.image,
				platforms.mastodon,
				logger,
			);
			if (mastodonUrl) {
				syndicationUrls.push({ href: mastodonUrl, title: "Mastodon" });
				logger.info(`POSSE: Successfully posted to Mastodon: ${mastodonUrl}`);
			}
		} catch (error) {
			logger.error(`POSSE: Mastodon syndication failed: ${error}`);
		}
	}

	// Syndicate to Bluesky
	if (platforms.bluesky) {
		try {
			logger.info("POSSE: Posting to Bluesky...");
			const blueskyContent = generatePostContent(
				post.data,
				canonicalUrl,
				post.body,
				"bluesky",
			);
			const blueskyUrl = await postToBluesky(
				blueskyContent,
				post.image,
				platforms.bluesky,
				logger,
			);
			if (blueskyUrl) {
				syndicationUrls.push({ href: blueskyUrl, title: "Bluesky" });
				logger.info(`POSSE: Successfully posted to Bluesky: ${blueskyUrl}`);
			}
		} catch (error) {
			logger.error(`POSSE: Bluesky syndication failed: ${error}`);
		}
	}

	// Update the post with syndication links
	if (syndicationUrls.length > 0) {
		await updatePostWithSyndication(post, syndicationUrls, logger);
	}
}

export function generatePostContent(
	data: EphemeraData,
	canonicalUrl: string,
	body: string,
	platform: "mastodon" | "bluesky",
): string {
	const initialContent = body?.trim() ? cleanContentForSocial(body.trim()) : "";
	const content =
		!initialContent || initialContent.length < 10
			? data.title || "New ephemera post"
			: initialContent;

	const maxLength = platform === "bluesky" ? 280 : 400;
	const finalContent =
		content.length > maxLength
			? content.substring(0, maxLength - 3) + "..."
			: content;

	return `${finalContent}\n\n${canonicalUrl}`;
}

export function cleanContentForSocial(markdown: string): string {
	return markdown
		.replace(/^###\s+(.+)$/gm, "• $1")
		.replace(/^##\s+(.+)$/gm, "$1")
		.replace(/^#\s+(.+)$/gm, "$1")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/\*([^*]+)\*/g, "$1")
		.replace(/```[\s\S]*?```/g, "[code block]")
		.replace(/\n\s*\n\s*\n/g, "\n\n")
		.replace(/[ \t]+/g, " ")
		.trim();
}

async function postToMastodon(
	content: string,
	image: EphemeraData["image"],
	config: MastodonConfig,
	logger: AstroIntegrationLogger,
): Promise<string | null> {
	try {
		let mediaId = null;

		if (image?.src) {
			try {
				const imagePath = image.src.startsWith("/")
					? join(process.cwd(), "public", image.src)
					: join(process.cwd(), "public", image.src);

				const imageBuffer = readFileSync(imagePath);
				const imageExt = extname(image.src).toLowerCase();

				const mimeType = (() => {
					switch (imageExt) {
						case ".jpg":
						case ".jpeg":
							return "image/jpeg";
						case ".png":
							return "image/png";
						case ".gif":
							return "image/gif";
						case ".webp":
							return "image/webp";
						default:
							return "image/jpeg";
					}
				})();

				const formData = new FormData();
				const blob = new Blob([imageBuffer], { type: mimeType });
				formData.append("file", blob, `image${imageExt}`);

				if (image.alt) {
					formData.append("description", image.alt);
				}

				const uploadResponse = await fetch(
					`https://${config.instance}/api/v1/media`,
					{
						method: "POST",
						headers: { Authorization: `Bearer ${config.token}` },
						body: formData,
					},
				);

				if (!uploadResponse.ok) {
					throw new Error(
						`Mastodon media upload failed: ${uploadResponse.status}`,
					);
				}

				const mediaData = await uploadResponse.json();
				mediaId = mediaData.id;
			} catch (error) {
				logger.warn(`POSSE: Image upload failed, posting text only: ${error}`);
			}
		}

		const requestBody: {
			status: string;
			visibility: "public";
			media_ids?: string[];
		} = { status: content, visibility: "public" };
		if (mediaId) {
			requestBody.media_ids = [mediaId];
		}

		const response = await fetch(`https://${config.instance}/api/v1/statuses`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${config.token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Mastodon API error: ${response.status} - ${error}`);
		}

		const data = await response.json();
		return data.url;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`POSSE: Mastodon posting error: ${errorMessage}`);
		throw error;
	}
}

async function postToBluesky(
	content: string,
	image: ImageData | undefined,
	config: BlueskyConfig,
	logger: AstroIntegrationLogger,
): Promise<string | null> {
	try {
		const authResponse = await fetch(
			"https://bsky.social/xrpc/com.atproto.server.createSession",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					identifier: config.username,
					password: config.password,
				}),
			},
		);

		if (!authResponse.ok) {
			throw new Error(`Bluesky auth failed: ${authResponse.status}`);
		}

		const session = await authResponse.json();

		// Create embed if image is available
		const embed = await (async (): Promise<
			Record<string, unknown> | undefined
		> => {
			if (!image?.src) return undefined;

			try {
				const imagePath = image.src.startsWith("/")
					? join(process.cwd(), "public", image.src)
					: join(process.cwd(), "public", image.src);

				const imageBuffer = readFileSync(imagePath);

				const blobResponse = await fetch(
					"https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${session.accessJwt}`,
							"Content-Type": getMimeType(image.src),
						},
						body: imageBuffer,
					},
				);

				if (!blobResponse.ok) {
					throw new Error(`Bluesky blob upload failed: ${blobResponse.status}`);
				}

				const blobData = await blobResponse.json();
				return {
					$type: "app.bsky.embed.images",
					images: [
						{
							image: blobData.blob,
							alt: image.alt || "Image from ephemera post",
						},
					],
				};
			} catch (error) {
				logger.warn(
					`POSSE: Bluesky image upload failed, posting text only: ${error}`,
				);
				return undefined;
			}
		})();

		const postRecord: {
			text: string;
			createdAt: string;
			embed?: Record<string, unknown>;
		} = {
			text: content,
			createdAt: new Date().toISOString(),
			...(embed && { embed }),
		};

		const postResponse = await fetch(
			"https://bsky.social/xrpc/com.atproto.repo.createRecord",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${session.accessJwt}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					repo: session.did,
					collection: "app.bsky.feed.post",
					record: postRecord,
				}),
			},
		);

		if (!postResponse.ok) {
			const errorData = await postResponse.text();
			throw new Error(
				`Bluesky post failed: ${postResponse.status} - ${errorData}`,
			);
		}

		const postData = await postResponse.json();
		const postUrl = `https://bsky.app/profile/${config.username}/post/${postData.uri.split("/").pop()}`;

		return postUrl;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`POSSE: Bluesky posting error: ${errorMessage}`);
		throw error;
	}
}

export function getMimeType(filename: string): string {
	const ext = extname(filename).toLowerCase();
	switch (ext) {
		case ".jpg":
		case ".jpeg":
			return "image/jpeg";
		case ".png":
			return "image/png";
		case ".gif":
			return "image/gif";
		case ".webp":
			return "image/webp";
		default:
			return "image/jpeg";
	}
}

async function updatePostWithSyndication(
	post: EphemeraPost,
	syndicationUrls: ReadonlyArray<SyndicationLink>,
	logger: AstroIntegrationLogger,
): Promise<void> {
	try {
		const sourcePath = join("src", "content", "ephemera", post.file);

		if (!sourcePath.endsWith(".md")) {
			logger.warn(`POSSE: Skipping non-markdown file: ${sourcePath}`);
			return;
		}

		const fileContent = readFileSync(sourcePath, "utf-8");
		const { data, content: body } = matter(fileContent);

		data.syndication = [...(data.syndication ?? []), ...syndicationUrls];

		const updatedContent = matter.stringify(body, data);
		writeFileSync(sourcePath, updatedContent);

		logger.info(`POSSE: Updated ${post.file} with syndication links`);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`POSSE: Failed to update post ${post.file}: ${errorMessage}`);
	}
}
