import type { AstroIntegration } from "astro";
import { readFileSync, writeFileSync, statSync, readdirSync } from "fs";
import { join, extname, basename } from "path";
import matter from "gray-matter";

// Types
interface PosseOptions {
	mastodon?: { token: string; instance: string };
	bluesky?: { username: string; password: string };
	dryRun?: boolean;
	maxPosts?: number;
}

interface Logger {
	info: (message: string) => void;
	warn: (message: string) => void;
	error: (message: string) => void;
	debug: (message: string) => void;
}

interface BlueskyBlob {
	$type: string;
	ref: {
		$link: string;
	};
	mimeType: string;
	size: number;
}

interface BlueskyEmbed {
	$type: string;
	images: Array<{
		image: BlueskyBlob;
		alt: string;
	}>;
}

interface EphemeraData {
	title?: string;
	date?: Date | string;
	syndication?: Array<{ href: string; title: string }>;
	image?: { src: string; alt: string };
}

interface EphemeraPost {
	file: string;
	data: EphemeraData;
	body: string;
	image?: EphemeraData["image"];
}

// Find Astro-processed images in dist/_astro/
function findProcessedImage(originalPath: string): string | null {
	try {
		const filename = basename(originalPath, extname(originalPath));
		const astroDir = join(process.cwd(), "dist", "_astro");

		// Look for processed files that start with the original filename
		const files = readdirSync(astroDir);
		const processedFile = files.find(
			(file) =>
				file.startsWith(filename + ".") &&
				(file.endsWith(".jpg") ||
					file.endsWith(".jpeg") ||
					file.endsWith(".png")),
		);

		return processedFile ? join(astroDir, processedFile) : null;
	} catch {
		// Directory doesn't exist or can't be read
		return null;
	}
}

// Check image size for platform limits
function checkImageSize(
	imagePath: string,
	platform: "mastodon" | "bluesky",
): boolean {
	try {
		const stats = statSync(imagePath);
		const sizeMB = stats.size / (1024 * 1024);

		const limits = {
			mastodon: 8, // 8MB
			bluesky: 0.95, // ~950KB
		};

		return sizeMB <= limits[platform];
	} catch {
		return false;
	}
}

export default function posseIntegration(
	options: PosseOptions = {},
): AstroIntegration {
	const { mastodon, bluesky, dryRun = false, maxPosts = 3 } = options;

	return {
		name: "posse-syndication",
		hooks: {
			"astro:build:done": async ({ logger }) => {
				logger.info("POSSE: Starting syndication process");

				try {
					await runSyndication({ mastodon, bluesky, dryRun, maxPosts, logger });
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
	mastodon?: PosseOptions["mastodon"];
	bluesky?: PosseOptions["bluesky"];
	dryRun: boolean;
	maxPosts: number;
	logger: Logger;
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
	logger: Logger,
): Promise<EphemeraPost[]> {
	try {
		const ephemeraDir = join(process.cwd(), "src", "content", "ephemera");
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		// Find all markdown files
		const markdownFiles: string[] = [];

		function scanDirectory(dir: string) {
			try {
				const items = readdirSync(dir);
				for (const item of items) {
					const fullPath = join(dir, item);
					const stat = statSync(fullPath);

					if (stat.isDirectory()) {
						scanDirectory(fullPath);
					} else if (item.endsWith(".md")) {
						markdownFiles.push(fullPath);
					}
				}
			} catch (error) {
				logger.warn(`POSSE: Could not scan directory ${dir}: ${error}`);
			}
		}

		scanDirectory(ephemeraDir);

		const recentPosts = markdownFiles
			.map((filePath) => {
				try {
					const fileContent = readFileSync(filePath, "utf-8");
					const { data, content } = matter(fileContent);

					// Check if post is recent
					const postDate = data.date ? new Date(data.date) : new Date(0);
					const isRecent = postDate > oneDayAgo;

					if (!isRecent) return null;

					// Check if already syndicated
					const hasSyndication = data.syndication?.length > 0;
					if (hasSyndication) return null;

					// Get relative path
					const relativePath = filePath.replace(
						join(process.cwd(), "src", "content", "ephemera") + "/",
						"",
					);

					return {
						file: relativePath,
						data,
						body: content || "",
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
		mastodon?: PosseOptions["mastodon"];
		bluesky?: PosseOptions["bluesky"];
	},
	logger: Logger,
): Promise<void> {
	const canonicalUrl = `https://ryanparsley.com/ephemera/${post.file.replace(".md", "")}`;
	const syndicationUrls: Array<{ href: string; title: string }> = [];

	// Syndicate to Mastodon
	if (platforms.mastodon) {
		try {
			logger.info("POSSE: Posting to Mastodon...");
			const mastodonUrl = await postToMastodon(
				post,
				canonicalUrl,
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
			const blueskyUrl = await postToBluesky(
				post,
				canonicalUrl,
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

async function postToMastodon(
	post: EphemeraPost,
	canonicalUrl: string,
	config: NonNullable<PosseOptions["mastodon"]>,
	logger: Logger,
): Promise<string | null> {
	try {
		const content = generatePostContent(
			post.data,
			canonicalUrl,
			post.body,
			"mastodon",
		);

		let mediaId = null;

		if (post.image?.src) {
			try {
				// Get original image path
				const originalImagePath = join(
					process.cwd(),
					"src",
					"content",
					"ephemera",
					post.file.replace(/\/[^/]+$/, ""),
					post.image.src.replace("./", ""),
				);

				// Try to find Astro-processed image first
				const processedImagePath = findProcessedImage(originalImagePath);

				let imageBuffer: Buffer | null = null;
				let imagePath: string | null = null;

				if (
					processedImagePath &&
					checkImageSize(processedImagePath, "mastodon")
				) {
					// Use Astro's optimized image
					imagePath = processedImagePath;
					imageBuffer = readFileSync(processedImagePath);
					logger.info(
						`POSSE: Using Astro-optimized image for Mastodon: ${processedImagePath}`,
					);
				} else if (checkImageSize(originalImagePath, "mastodon")) {
					// Fallback to original image
					imagePath = originalImagePath;
					imageBuffer = readFileSync(originalImagePath);
					logger.info(
						`POSSE: Using original image for Mastodon: ${originalImagePath}`,
					);
				} else {
					logger.warn(`POSSE: Image too large for Mastodon, skipping`);
					// Continue with text-only post
				}

				if (imageBuffer && imagePath) {
					const imageExt = extname(imagePath).toLowerCase();
					const mimeType = imageExt === ".png" ? "image/png" : "image/jpeg";

					const formData = new FormData();
					const blob = new Blob([imageBuffer], { type: mimeType });
					formData.append("file", blob, `image${imageExt}`);

					if (post.image.alt) {
						formData.append("description", post.image.alt);
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
				}
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
	post: EphemeraPost,
	canonicalUrl: string,
	config: NonNullable<PosseOptions["bluesky"]>,
	logger: Logger,
): Promise<string | null> {
	try {
		const content = generatePostContent(
			post.data,
			canonicalUrl,
			post.body,
			"bluesky",
		);

		// Authenticate with Bluesky
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

		// Handle image if present
		let embed = undefined;
		if (post.image?.src) {
			try {
				// Get original image path
				const originalImagePath = join(
					process.cwd(),
					"src",
					"content",
					"ephemera",
					post.file.replace(/\/[^/]+$/, ""),
					post.image.src.replace("./", ""),
				);

				// Try to find Astro-processed image first
				const processedImagePath = findProcessedImage(originalImagePath);

				let imageBuffer: Buffer | null = null;

				if (
					processedImagePath &&
					checkImageSize(processedImagePath, "bluesky")
				) {
					// Use Astro's optimized image
					imageBuffer = readFileSync(processedImagePath);
					logger.info(
						`POSSE: Using Astro-optimized image for Bluesky: ${processedImagePath}`,
					);
				} else if (checkImageSize(originalImagePath, "bluesky")) {
					// Fallback to original image
					imageBuffer = readFileSync(originalImagePath);
					logger.info(
						`POSSE: Using original image for Bluesky: ${originalImagePath}`,
					);
				} else {
					logger.warn(`POSSE: Image too large for Bluesky, skipping`);
					// Continue with text-only post
				}

				if (imageBuffer) {
					const blobResponse = await fetch(
						"https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
						{
							method: "POST",
							headers: {
								Authorization: `Bearer ${session.accessJwt}`,
								"Content-Type": "image/jpeg",
							},
							body: imageBuffer,
						},
					);

					if (!blobResponse.ok) {
						throw new Error(
							`Bluesky blob upload failed: ${blobResponse.status}`,
						);
					}

					const blobData = await blobResponse.json();
					embed = {
						$type: "app.bsky.embed.images",
						images: [
							{
								image: blobData.blob,
								alt: post.image.alt || "Image from ephemera post",
							},
						],
					};
				}
			} catch (error) {
				logger.warn(
					`POSSE: Bluesky image upload failed, posting text only: ${error}`,
				);
			}
		}

		const postRecord: {
			text: string;
			createdAt: string;
			embed?: BlueskyEmbed;
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

// Export types for testing
export type { EphemeraPost, EphemeraData };
export interface ImageData {
	src: string;
	alt: string;
}

async function updatePostWithSyndication(
	post: EphemeraPost,
	syndicationUrls: Array<{ href: string; title: string }>,
	logger: Logger,
): Promise<void> {
	try {
		const sourcePath = join(
			process.cwd(),
			"src",
			"content",
			"ephemera",
			post.file,
		);

		if (!sourcePath.endsWith(".md")) {
			logger.warn(`POSSE: Skipping non-markdown file: ${sourcePath}`);
			return;
		}

		const fileContent = readFileSync(sourcePath, "utf-8");
		const { data, content } = matter(fileContent);

		data.syndication = [...(data.syndication ?? []), ...syndicationUrls];

		const updatedContent = matter.stringify(content, data);
		writeFileSync(sourcePath, updatedContent);

		logger.info(
			`POSSE: Updated ${post.file} with syndication links: ${syndicationUrls.map((s) => s.title).join(", ")}`,
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`POSSE: Failed to update post ${post.file}: ${errorMessage}`);
	}
}

// Note: writeFileSync is already imported from 'fs' at the top of the file
