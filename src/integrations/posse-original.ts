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
function findProcessedImage(
	originalPath: string,
	preferSmaller: boolean = false,
	logger?: Logger,
): string | null {
	try {
		const filename = basename(originalPath, extname(originalPath));
		const astroDir = join(process.cwd(), "dist", "_astro");

		// Look for processed files that start with the original filename
		const files = readdirSync(astroDir);
		const processedFiles = files.filter(
			(file) =>
				file.startsWith(filename + ".") &&
				(file.endsWith(".jpg") ||
					file.endsWith(".jpeg") ||
					file.endsWith(".png") ||
					file.endsWith(".webp")),
		);

		if (processedFiles.length === 0) {
			return null;
		}

		// Find best file using functional approach
		const extensionPriority = { ".webp": 3, ".jpg": 2, ".jpeg": 2, ".png": 1 };

		const bestFile = processedFiles.reduce(
			(best: { file: string | null; size: number; priority: number }, file) => {
				const filePath = join(astroDir, file);
				const fileSize = statSync(filePath).size;
				const fileExt = extname(file).toLowerCase();
				const priority =
					extensionPriority[fileExt as keyof typeof extensionPriority] || 0;

				if (preferSmaller) {
					// Find smallest file
					return fileSize < best.size
						? { file, size: fileSize, priority }
						: best;
				} else {
					// Find highest priority (WebP > JPG > PNG), then smallest size
					if (
						priority > best.priority ||
						(priority === best.priority && fileSize < best.size)
					) {
						return { file, size: fileSize, priority };
					}
					return best;
				}
			},
			{
				file: null as string | null,
				size: preferSmaller ? Infinity : 0,
				priority: preferSmaller ? 0 : -1,
			},
		);

		return bestFile.file ? join(astroDir, bestFile.file) : null;
	} catch (error) {
		// Directory doesn't exist or can't be read - this is expected during first build
		if (logger) {
			logger.debug(
				`POSSE: Could not find processed images for ${basename(originalPath)}: ${error}`,
			);
		}
		return null;
	}
}

// Check image size for platform limits
function checkImageSize(
	imagePath: string,
	platform: "mastodon" | "bluesky",
	logger?: Logger,
): boolean {
	try {
		const stats = statSync(imagePath);
		const sizeMB = stats.size / (1024 * 1024);
		const sizeKB = stats.size / 1024;

		const limits = {
			mastodon: 8, // 8MB (Mastodon allows up to 8MB)
			bluesky: 0.8, // 800KB (Conservative limit well under Bluesky's 1MB = 1,000,000 bytes)
		};

		const withinLimit = sizeMB <= limits[platform];
		if (logger) {
			const limitBytes = Math.floor(limits[platform] * 1024 * 1024);
			logger.debug(
				`POSSE: Image size check - ${imagePath}: ${sizeMB.toFixed(2)}MB (${sizeKB.toFixed(1)}KB, ${stats.size} bytes), limit: ${limits[platform]}MB (${limitBytes} bytes), within limit: ${withinLimit}`,
			);
		}

		return withinLimit;
	} catch (error) {
		if (logger) {
			logger.warn(
				`POSSE: Could not check image size for ${imagePath}: ${error}`,
			);
		}
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
	logger.info("POSSE: ===== SYNDICATION PROCESS STARTED =====");
	logger.info(
		`POSSE: Configuration - Mastodon: ${mastodon ? "enabled" : "disabled"}, Bluesky: ${bluesky ? "enabled" : "disabled"}, Dry Run: ${dryRun}`,
	);

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

	// Process each post using functional approach
	await Promise.all(
		recentPosts
			.map((post) => {
				const existingSyndication = post.data.syndication || [];
				const mastodonConfigured = !!mastodon;
				const blueskyConfigured = !!bluesky;

				// Check which platforms are already syndicated
				const hasMastodon = existingSyndication.some(
					(s) => s.title === "Mastodon",
				);
				const hasBluesky = existingSyndication.some(
					(s) => s.title === "Bluesky",
				);

				// Determine if we need to syndicate to any platforms
				const needsMastodon = mastodonConfigured && !hasMastodon;
				const needsBluesky = blueskyConfigured && !hasBluesky;

				if (!needsMastodon && !needsBluesky) {
					logger.debug(
						`POSSE: Skipping fully syndicated: ${post.data.title || post.file}`,
					);
					return null; // Skip this post
				}

				const platformsToSyndicate = [];
				if (needsMastodon) platformsToSyndicate.push("Mastodon");
				if (needsBluesky) platformsToSyndicate.push("Bluesky");

				return {
					post,
					platformsToSyndicate,
					needsMastodon,
					needsBluesky,
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null)
			.map(
				async ({ post, platformsToSyndicate, needsMastodon, needsBluesky }) => {
					if (dryRun) {
						logger.info(
							`POSSE: DRY RUN - Would syndicate ${post.data.title || post.file} to: ${platformsToSyndicate.join(", ")}`,
						);
						return;
					}

					logger.info(
						`POSSE: Syndicating ${post.data.title || post.file} to: ${platformsToSyndicate.join(", ")}`,
					);
					await syndicateSinglePost(
						post,
						{
							mastodon: needsMastodon ? mastodon : undefined,
							bluesky: needsBluesky ? bluesky : undefined,
						},
						logger,
					);

					// Rate limiting
					if (!dryRun) {
						await new Promise((resolve) => setTimeout(resolve, 2000));
					}
				},
			),
	);

	logger.info(`POSSE: ===== POST PROCESSING COMPLETE =====`);
}

async function getRecentEphemeraPosts(
	maxPosts: number,
	logger: Logger,
): Promise<EphemeraPost[]> {
	try {
		const ephemeraDir = join(process.cwd(), "src", "content", "ephemera");
		// Legacy cutoff: only process posts from 2025-08-30 or newer
		const legacyCutoff = new Date("2025-08-30T00:00:00.000Z");

		logger.info(`POSSE: Legacy cutoff date: ${legacyCutoff.toISOString()}`);

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
						// Quick pre-filter: skip obviously old files by filename
						// This helps performance when there are many historical posts
						const filenameDateMatch = item.match(/(\d{4}-\d{2}-\d{2})/);
						if (filenameDateMatch && filenameDateMatch[1]) {
							const fileDate = new Date(filenameDateMatch[1]);
							if (fileDate < legacyCutoff) {
								continue; // Skip files that are clearly before cutoff
							}
						}
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

					// Get relative path for logging
					const relativePath = filePath.replace(
						join(process.cwd(), "src", "content", "ephemera") + "/",
						"",
					);

					// Check if post is from 2025-08-30 or newer (legacy cutoff)
					const postDate = data.date ? new Date(data.date) : new Date(0);
					const isFromCutoffOrNewer = postDate >= legacyCutoff;

					if (!isFromCutoffOrNewer) {
						logger.debug(
							`POSSE: Skipping ${relativePath} - before legacy cutoff`,
						);
						return null;
					}

					// Check if already syndicated to ALL configured platforms
					const existingSyndication = data.syndication || [];
					const mastodonConfigured =
						!!process.env.MASTODON_ACCESS_TOKEN &&
						!!process.env.MASTODON_INSTANCE;
					const blueskyConfigured =
						!!process.env.BLUESKY_USERNAME && !!process.env.BLUESKY_PASSWORD;

					// Count configured platforms
					const configuredPlatforms = [
						mastodonConfigured && "mastodon",
						blueskyConfigured && "bluesky",
					].filter(Boolean);
					const configuredCount = configuredPlatforms.length;

					// Count successful syndications
					const successfulSyndications = existingSyndication.length;

					if (successfulSyndications >= configuredCount) {
						logger.info(
							`POSSE: Skipping ${relativePath} - fully syndicated (${successfulSyndications}/${configuredCount} platforms)`,
						);
						return null;
					} else if (successfulSyndications > 0) {
						logger.info(
							`POSSE: Will retry ${relativePath} - partially syndicated (${successfulSyndications}/${configuredCount} platforms)`,
						);
					}

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

		logger.info(
			`POSSE: Found ${recentPosts.length} recent ephemera posts to process`,
		);
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

	logger.info(`POSSE: Syndicating post: ${post.file}`);
	logger.info(`POSSE: Canonical URL: ${canonicalUrl}`);
	logger.info(
		`POSSE: Platforms enabled - Mastodon: ${!!platforms.mastodon}, Bluesky: ${!!platforms.bluesky}`,
	);

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
			} else {
				logger.warn(`POSSE: Mastodon syndication returned no URL`);
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
			} else {
				logger.warn(`POSSE: Bluesky syndication returned no URL`);
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
		// Validate configuration
		if (!config.token || config.token.length < 10) {
			throw new Error(
				`Invalid Mastodon token: token is missing or too short (${config.token?.length || 0} chars)`,
			);
		}
		if (!config.instance || !config.instance.includes(".")) {
			throw new Error(`Invalid Mastodon instance: ${config.instance}`);
		}

		logger.info(
			`POSSE: Mastodon config validation passed - instance: ${config.instance}, token length: ${config.token.length}`,
		);

		// Test instance connectivity
		try {
			const instanceTest = await fetch(
				`https://${config.instance}/api/v1/instance`,
				{
					headers: { Authorization: `Bearer ${config.token}` },
				},
			);
			if (!instanceTest.ok) {
				logger.warn(
					`POSSE: Mastodon instance test failed: ${instanceTest.status}`,
				);
			} else {
				logger.info(`POSSE: Mastodon instance connectivity test passed`);
			}
		} catch (error) {
			logger.warn(
				`POSSE: Could not test Mastodon instance connectivity: ${error}`,
			);
		}

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

				// Try to find Astro-processed image first (prefer WebP for quality)
				const processedImagePath = findProcessedImage(
					originalImagePath,
					false,
					logger,
				);

				let imageBuffer: Buffer | null = null;
				let imagePath: string | null = null;

				if (
					processedImagePath &&
					checkImageSize(processedImagePath, "mastodon", logger)
				) {
					// Use Astro's optimized image
					imagePath = processedImagePath;
					imageBuffer = readFileSync(processedImagePath);
				} else if (checkImageSize(originalImagePath, "mastodon", logger)) {
					// Fallback to original image
					imagePath = originalImagePath;
					imageBuffer = readFileSync(originalImagePath);
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
						const errorText = await uploadResponse.text();
						logger.error(
							`POSSE: Mastodon media upload failed with status ${uploadResponse.status}`,
						);
						logger.error(`POSSE: Error response: ${errorText}`);
						logger.error(
							`POSSE: Request headers: ${JSON.stringify({ Authorization: `Bearer ${config.token.substring(0, 10)}...` })}`,
						);
						logger.error(`POSSE: Instance: ${config.instance}`);

						// Provide helpful error messages for common issues
						let errorMessage = `Mastodon media upload failed: ${uploadResponse.status}`;
						if (uploadResponse.status === 403) {
							errorMessage +=
								' - This usually means the access token does not have media upload permissions. Please check your Mastodon app settings and ensure the token has "write:media" scope.';
						} else if (uploadResponse.status === 401) {
							errorMessage +=
								" - Authentication failed. Please check your Mastodon access token.";
						} else if (uploadResponse.status === 422) {
							errorMessage += " - The media file may be invalid or too large.";
						}

						throw new Error(`${errorMessage} - ${errorText}`);
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

				// Try to find Astro-processed image first (prefer smallest for Bluesky's 1MB limit)
				const processedImagePath = findProcessedImage(
					originalImagePath,
					true,
					logger,
				);

				let imageBuffer: Buffer | null = null;

				if (
					processedImagePath &&
					checkImageSize(processedImagePath, "bluesky", logger)
				) {
					// Use Astro's optimized image
					imageBuffer = readFileSync(processedImagePath);
				} else if (checkImageSize(originalImagePath, "bluesky", logger)) {
					// Fallback to original image
					imageBuffer = readFileSync(originalImagePath);
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

	const maxLength = platform === "bluesky" ? 300 : 400;
	// Reserve space for "\n\n" + canonicalUrl
	const urlSuffix = `\n\n${canonicalUrl}`;
	// Add safety buffer for grapheme counting differences and JSON overhead
	const safetyBuffer = platform === "bluesky" ? 20 : 10;
	const availableContentLength = maxLength - urlSuffix.length - safetyBuffer;

	const finalContent =
		content.length > availableContentLength
			? content.substring(0, availableContentLength - 3) + "..."
			: content;

	const result = `${finalContent}${urlSuffix}`;

	// Log content lengths for debugging
	if (platform === "bluesky") {
		console.log(
			`POSSE: Bluesky content lengths - content: ${content.length}, available: ${availableContentLength}, final: ${finalContent.length}, total: ${result.length}, max: ${maxLength}`,
		);
	}

	return result;
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

		// Check if file exists
		try {
			statSync(sourcePath);
		} catch (error) {
			logger.error(`POSSE: File does not exist: ${sourcePath}`);
			throw error;
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
