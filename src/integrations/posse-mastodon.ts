// POSSE Mastodon Module
// Handles Mastodon-specific posting logic

import { readFileSync } from "fs";
import { join, extname, basename } from "path";
import { statSync, readdirSync } from "fs";
import {
	generatePostContent,
	type EphemeraPost,
	type Logger,
	type SyndicationResult,
} from "./posse";

export interface MastodonConfig {
	token: string;
	instance: string;
}

/**
 * Posts content to Mastodon
 */
export async function postToMastodon(
	post: EphemeraPost,
	canonicalUrl: string,
	config: MastodonConfig,
	logger: Logger,
): Promise<SyndicationResult> {
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

		logger.debug(
			`POSSE: Mastodon config validation passed - instance: ${config.instance}, token length: ${config.token.length}`,
		);

		// Test instance connectivity
		await testMastodonConnectivity(config, logger);

		const content = generatePostContent(
			post.data,
			canonicalUrl,
			post.body,
			"mastodon",
		);

		let mediaId: string | null = null;

		// Handle image if present
		if (post.image?.src) {
			mediaId = await uploadImageToMastodon(post, config, logger);
		}

		// Create the post
		const postUrl = await createMastodonPost(content, mediaId, config);

		return {
			url: postUrl,
			success: true,
			platform: "mastodon",
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`POSSE: Mastodon posting error: ${errorMessage}`);
		return {
			success: false,
			platform: "mastodon",
			error: errorMessage,
		};
	}
}

/**
 * Tests Mastodon instance connectivity
 */
async function testMastodonConnectivity(
	config: MastodonConfig,
	logger: Logger,
): Promise<void> {
	try {
		const response = await fetch(`https://${config.instance}/api/v1/instance`, {
			headers: { Authorization: `Bearer ${config.token}` },
		});
		if (!response.ok) {
			logger.warn(`POSSE: Mastodon instance test failed: ${response.status}`);
		} else {
			logger.debug(`POSSE: Mastodon instance connectivity test passed`);
		}
	} catch (error) {
		logger.warn(
			`POSSE: Could not test Mastodon instance connectivity: ${error}`,
		);
	}
}

/**
 * Uploads an image to Mastodon
 */
async function uploadImageToMastodon(
	post: EphemeraPost,
	config: MastodonConfig,
	logger: Logger,
): Promise<string | null> {
	if (!post.image) return null;

	try {
		const imageResult = processImageForPlatform(post.image, "mastodon", logger);
		if (!imageResult) return null;

		const imageBuffer = readFileSync(imageResult.path!);
		const mimeType = imageResult.mimeType;

		logger.debug(
			`POSSE: Preparing image upload - size: ${imageBuffer.length} bytes, type: ${mimeType}`,
		);

		const formData = new FormData();
		const blob = new Blob([imageBuffer], { type: mimeType });
		formData.append("file", blob, `image${getExtensionFromMimeType(mimeType)}`);

		if (post.image.alt) {
			formData.append("description", post.image.alt);
			logger.debug(`POSSE: Added alt text: ${post.image.alt}`);
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
		return mediaData.id;
	} catch (error) {
		logger.warn(`POSSE: Image upload failed, posting text only: ${error}`);
		return null;
	}
}

/**
 * Creates a post on Mastodon
 */
async function createMastodonPost(
	content: string,
	mediaId: string | null,
	config: MastodonConfig,
): Promise<string> {
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
}

/**
 * Gets file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
	switch (mimeType) {
		case "image/jpeg":
			return ".jpg";
		case "image/png":
			return ".png";
		case "image/gif":
			return ".gif";
		case "image/webp":
			return ".webp";
		default:
			return ".jpg";
	}
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

/**
 * Processes an image for a specific platform
 */
function processImageForPlatform(
	postImage: { src: string; alt: string },
	platform: "mastodon" | "bluesky",
	logger: Logger,
): { path: string | null; size: number; mimeType: string } | null {
	try {
		// Get original image path
		const originalImagePath = join(
			process.cwd(),
			"src",
			"content",
			"ephemera",
			postImage.src.replace("./", ""),
		);

		// Try to find Astro-processed image first
		const preferSmaller = platform === "bluesky"; // Bluesky has smaller limits
		const processedImagePath = findProcessedImage(
			originalImagePath,
			preferSmaller,
			logger,
		);

		let imagePath: string;
		let imageBuffer: Buffer;

		if (
			processedImagePath &&
			checkImageSize(processedImagePath, platform, logger)
		) {
			// Use Astro's optimized image
			imagePath = processedImagePath;
			imageBuffer = readFileSync(processedImagePath);
			logger.debug(
				`POSSE: Using Astro-optimized image for ${platform}: ${processedImagePath}`,
			);
		} else if (checkImageSize(originalImagePath, platform, logger)) {
			// Fallback to original image
			imagePath = originalImagePath;
			imageBuffer = readFileSync(originalImagePath);
			logger.debug(
				`POSSE: Using original image for ${platform}: ${originalImagePath}`,
			);
		} else {
			logger.warn(`POSSE: Image too large for ${platform}, skipping`);
			return null;
		}

		const mimeType = getMimeType(imagePath);

		return {
			path: imagePath,
			size: imageBuffer.length,
			mimeType,
		};
	} catch (error) {
		logger.warn(`POSSE: Image processing failed: ${error}`);
		return null;
	}
}

/**
 * Finds Astro-processed images in dist/_astro/
 */
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

/**
 * Checks if an image meets platform size limits
 */
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
