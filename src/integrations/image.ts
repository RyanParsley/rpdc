// Image processing utilities for POSSE syndication.
//
// Single source of truth for the image helpers previously duplicated across
// posse.ts, posse-bluesky.ts, and posse-mastodon.ts. Platform modules import
// from here rather than re-implementing.

import { readFileSync, statSync, readdirSync } from "fs";
import { join, extname, basename } from "path";

// ============================================================================
// TYPES
// ============================================================================

/** Supported syndication platforms. */
export type SyndicationPlatform = "mastodon" | "bluesky";

/** Minimal logger surface needed by the image helpers (a `Logger` satisfies it). */
export interface ImageLogger {
	debug: (message: string) => void;
	warn: (message: string) => void;
}

/** Resolved image: absolute path plus its in-memory bytes. */
export type ResolvedImage = {
	path: string;
	buffer: Buffer;
};

/** Full processing result consumed by platform uploaders. */
export type ProcessedImage = {
	path: string;
	buffer: Buffer;
	size: number;
	mimeType: string;
};

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

/**
 * Resolves an image src into an absolute filesystem path.
 *
 * - `./foo.jpg` → src/content/ephemera/foo.jpg
 * - `/foo.jpg`  → public/foo.jpg
 * - `foo.jpg`   → src/content/ephemera/foo.jpg
 */
export function resolveImagePath(src: string): string {
	return src.startsWith("./")
		? join(process.cwd(), "src", "content", "ephemera", src.slice(2))
		: src.startsWith("/")
			? join(process.cwd(), "public", src.slice(1))
			: join(process.cwd(), "src", "content", "ephemera", src);
}

/**
 * Selects the best available image source, preferring an Astro-processed image
 * when it meets the platform's size limit, otherwise the original.
 */
export function selectImageSource(
	processedPath: string | null,
	originalPath: string,
	platform: SyndicationPlatform,
	logger: ImageLogger,
): ResolvedImage | null {
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
 * Builds the canonical processing result from a resolved image.
 */
export function createImageResult(
	imageResult: ResolvedImage,
): Omit<ProcessedImage, "buffer"> {
	return {
		path: imageResult.path,
		size: imageResult.buffer.length,
		mimeType: getMimeType(imageResult.path),
	};
}

/**
 * Checks whether an image file meets a platform's size limit.
 */
export function checkImageSize(
	imagePath: string,
	platform: SyndicationPlatform,
	logger?: ImageLogger,
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
 * Gets the MIME type for a file from its extension. Unknown extensions fall
 * back to `image/jpeg`.
 */
export function getMimeType(filename: string): string {
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
			return "image/jpeg";
	}
}

/**
 * Gets a file extension from a MIME type. Unknown types fall back to `.jpg`.
 */
export function getExtensionFromMimeType(mimeType: string): string {
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

/**
 * Finds an Astro-processed image in `dist/_astro/` that matches an original
 * filename, preferring WebP > JPG > PNG, then smallest size (or the smallest
 * overall when `preferSmaller` is set — e.g. Bluesky's tighter limits).
 */
export function findProcessedImage(
	originalPath: string,
	preferSmaller: boolean = false,
	logger?: ImageLogger,
): string | null {
	try {
		const filename = basename(originalPath, extname(originalPath));
		const astroDir = join(process.cwd(), "dist", "_astro");

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

		const extensionPriority = { ".webp": 3, ".jpg": 2, ".jpeg": 2, ".png": 1 };

		const bestFile = processedFiles.reduce(
			(best: { file: string | null; size: number; priority: number }, file) => {
				const filePath = join(astroDir, file);
				const fileSize = statSync(filePath).size;
				const fileExt = extname(file).toLowerCase();
				const priority =
					extensionPriority[fileExt as keyof typeof extensionPriority] || 0;

				if (preferSmaller) {
					return fileSize < best.size
						? { file, size: fileSize, priority }
						: best;
				}

				if (
					priority > best.priority ||
					(priority === best.priority && fileSize < best.size)
				) {
					return { file, size: fileSize, priority };
				}

				return best;
			},
			{
				file: null as string | null,
				size: preferSmaller ? Infinity : 0,
				priority: preferSmaller ? 0 : -1,
			},
		);

		return bestFile.file ? join(astroDir, bestFile.file) : null;
	} catch (error) {
		// dist/_astro doesn't exist on the first build; treat as "no matches", not an error
		if (logger) {
			logger.debug(
				`POSSE: Could not find processed images for ${basename(originalPath)}: ${error}`,
			);
		}
		return null;
	}
}

/**
 * Processes an image for a specific platform: resolve the best available source
 * (Astro-optimized when in size, else original), reading it into memory.
 */
export function processImageForPlatform(
	postImage: { src: string; alt: string },
	platform: SyndicationPlatform,
	logger: ImageLogger,
): ProcessedImage | null {
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
