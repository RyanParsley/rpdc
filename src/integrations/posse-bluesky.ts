// POSSE Bluesky Module
// Handles Bluesky-specific posting logic

import { readFileSync, statSync, readdirSync } from "fs";
import { join, extname, basename } from "path";
import {
	generatePostContent,
	type EphemeraPost,
	type Logger,
	type SyndicationResult,
} from "./posse";

export interface BlueskyConfig {
	username: string;
	password: string;
}

/**
 * Posts content to Bluesky
 */
export async function postToBluesky(
	post: EphemeraPost,
	canonicalUrl: string,
	config: BlueskyConfig,
	logger: Logger,
): Promise<SyndicationResult> {
	try {
		const content = generatePostContent(
			post.data,
			canonicalUrl,
			post.body,
			"bluesky",
		);

		// Authenticate with Bluesky
		const session = await authenticateWithBluesky(config, logger);

		// Handle image if present
		let embed: BlueskyEmbed | undefined;
		if (post.image?.src) {
			const imageBlob = await uploadImageToBluesky(session, post, logger);
			if (imageBlob) {
				embed = {
					$type: "app.bsky.embed.images",
					images: [
						{
							image: imageBlob,
							alt: post.image.alt || "Image from ephemera post",
						},
					],
				};
			}
		}

		// Create the post
		const postUrl = await createBlueskyPost(
			session,
			content,
			embed,
			config,
			logger,
		);

		return {
			url: postUrl,
			success: true,
			platform: "bluesky",
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`POSSE: Bluesky posting error: ${errorMessage}`);
		return {
			success: false,
			platform: "bluesky",
			error: errorMessage,
		};
	}
}

/**
 * Authenticates with Bluesky and returns session
 */
async function authenticateWithBluesky(
	config: BlueskyConfig,
	logger: Logger,
): Promise<BlueskySession> {
	logger.debug("POSSE: Authenticating with Bluesky...");

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
	logger.debug("POSSE: Bluesky authentication successful");

	return session;
}

/**
 * Uploads an image to Bluesky
 */
async function uploadImageToBluesky(
	session: BlueskySession,
	post: EphemeraPost,
	logger: Logger,
): Promise<BlueskyBlob | null> {
	if (!post.image) return null;

	try {
		const imageResult = processImageForPlatform(post.image, "bluesky", logger);
		if (!imageResult) return null;

		const imageBuffer = imageResult.buffer;

		const blobResponse = await fetch(
			"https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${session.accessJwt}`,
					"Content-Type": imageResult.mimeType,
				},
				body: imageBuffer,
			},
		);

		if (!blobResponse.ok) {
			throw new Error(`Bluesky blob upload failed: ${blobResponse.status}`);
		}

		const blobData = await blobResponse.json();
		logger.debug(`POSSE: Image uploaded to Bluesky as blob`);

		return blobData.blob;
	} catch (error) {
		logger.warn(
			`POSSE: Bluesky image upload failed, posting text only: ${error}`,
		);
		return null;
	}
}

/**
 * Parses URLs from text and creates facets for clickable links
 */
export function parseUrlFacets(text: string): BlueskyFacet[] | undefined {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	const encoder = new TextEncoder();

	const facets = [...text.matchAll(urlRegex)]
		.map((match) => {
			let uri = match[0];
			let endOffset = match[0].length;

			// Strip trailing punctuation
			if (/[.,;!?]$/.test(uri)) {
				uri = uri.slice(0, -1);
				endOffset--;
			}
			if (/[)]$/.test(uri) && !uri.includes("(")) {
				uri = uri.slice(0, -1);
				endOffset--;
			}

			// Validate URL
			try {
				new URL(uri);
			} catch {
				return null; // Invalid URL, skip
			}

			const byteStart = encoder.encode(text.slice(0, match.index!)).length;
			const byteEnd = encoder.encode(
				text.slice(0, match.index! + endOffset),
			).length;

			if (byteStart >= byteEnd) return null;

			return {
				index: {
					byteStart,
					byteEnd,
				},
				features: [
					{
						$type: "app.bsky.richtext.facet#link" as const,
						uri,
					},
				],
			};
		})
		.filter((facet): facet is BlueskyFacet => facet !== null);

	return facets.length > 0 ? facets : undefined;
}

/**
 * Creates a post on Bluesky
 */
async function createBlueskyPost(
	session: BlueskySession,
	content: string,
	embed: BlueskyEmbed | undefined,
	config: BlueskyConfig,
	logger: Logger,
): Promise<string> {
	logger.debug("POSSE: Creating Bluesky post...");

	// Parse URLs and create facets for clickable links
	const facets = parseUrlFacets(content);

	const postRecord: {
		text: string;
		createdAt: string;
		embed?: BlueskyEmbed;
		facets?: BlueskyFacet[];
	} = {
		text: content,
		createdAt: new Date().toISOString(),
		...(embed && { embed }),
		...(facets && { facets }),
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

	logger.debug("POSSE: Bluesky post created successfully");
	return postUrl;
}

// ============================================================================
// BLUESKY TYPES
// ============================================================================

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

interface BlueskyFacet {
	index: {
		byteStart: number;
		byteEnd: number;
	};
	features: Array<{
		$type: "app.bsky.richtext.facet#link";
		uri: string;
	}>;
}

interface BlueskySession {
	accessJwt: string;
	did: string;
	handle: string;
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

/**
 * Resolves image path based on source format
 */
function resolveImagePath(src: string): string {
	return src.startsWith("./")
		? join(process.cwd(), "src", "content", "ephemera", src.slice(2))
		: src.startsWith("/")
			? join(process.cwd(), "public", src.slice(1))
			: join(process.cwd(), "src", "content", "ephemera", src);
}

/**
 * Selects the best available image source
 */
function selectImageSource(
	processedPath: string | null,
	originalPath: string,
	platform: "mastodon" | "bluesky",
	logger: { debug: (msg: string) => void; warn: (msg: string) => void },
): { path: string; buffer: Buffer } | null {
	if (processedPath && checkImageSize(processedPath, platform, logger)) {
		logger.debug(
			`POSSE: Using Astro-optimized image for ${platform}: ${processedPath}`,
		);
		return { path: processedPath, buffer: readFileSync(processedPath) };
	}

	if (checkImageSize(originalPath, platform, logger)) {
		logger.debug(
			`POSSE: Using original image for ${platform}: ${originalPath}`,
		);
		return { path: originalPath, buffer: readFileSync(originalPath) };
	}

	return null;
}

/**
 * Checks if an image meets platform size limits
 */
function checkImageSize(
	imagePath: string,
	platform: "mastodon" | "bluesky",
	logger?: { debug: (msg: string) => void; warn: (msg: string) => void },
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

/**
 * Gets MIME type for a given filename
 */
function getMimeType(filename: string): string {
	const ext = filename.toLowerCase().split(".").pop() || "";

	switch (ext) {
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "png":
			return "image/png";
		case "gif":
			return "image/gif";
		case "webp":
			return "image/webp";
		default:
			return "image/jpeg"; // fallback
	}
}

/**
 * Finds Astro-processed images in dist/_astro/
 */
function findProcessedImage(
	originalPath: string,
	preferSmaller: boolean = false,
	logger?: { debug: (msg: string) => void },
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

/**
 * Processes an image for a specific platform
 */
function processImageForPlatform(
	postImage: { src: string; alt: string },
	platform: "mastodon" | "bluesky",
	logger: { debug: (msg: string) => void; warn: (msg: string) => void },
): { path: string; buffer: Buffer; size: number; mimeType: string } | null {
	try {
		const originalImagePath = resolveImagePath(postImage.src);
		const processedImagePath = findProcessedImage(
			originalImagePath,
			platform === "bluesky",
			logger,
		);

		const imageResult = selectImageSource(
			processedImagePath,
			originalImagePath,
			platform,
			logger,
		);

		if (!imageResult) {
			logger.warn(`POSSE: Image too large for ${platform}, skipping`);
			return null;
		}

		return {
			path: imageResult.path,
			buffer: imageResult.buffer,
			size: imageResult.buffer.length,
			mimeType: getMimeType(imageResult.path),
		};
	} catch (error) {
		logger.warn(`POSSE: Image processing failed: ${error}`);
		return null;
	}
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================
