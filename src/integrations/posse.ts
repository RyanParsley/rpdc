// POSSE Integration - Clean & Functional
// Main orchestration with platform-specific modules

import { writeFileSync, statSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import type { AstroIntegration } from "astro";

import { postToMastodon, type MastodonConfig } from "./posse-mastodon";
import { postToBluesky, type BlueskyConfig } from "./posse-bluesky";

// ============================================================================
// TYPES
// ============================================================================

export interface PosseOptions {
	mastodon?: { token: string; instance: string };
	bluesky?: { username: string; password: string };
	dryRun?: boolean;
	maxPosts?: number;
}

export interface Logger {
	info: (message: string) => void;
	warn: (message: string) => void;
	error: (message: string) => void;
	debug: (message: string) => void;
}

export type AstroLogger = Logger;

export interface SyndicationContext {
	mastodon: boolean;
	bluesky: boolean;
	dryRun: boolean;
	maxPosts: number;
	logger: Logger;
}

export interface CollectionDescriptor {
	name: string;
	contentDir: string;
	urlSegment: string;
	dateField: "date" | "pubDate";
	contentMode: "body" | "title";
	requirePublished: boolean;
}

export const EPHEMERA_COLLECTION: CollectionDescriptor = {
	name: "ephemera",
	contentDir: join("src", "content", "ephemera"),
	urlSegment: "ephemera",
	dateField: "date",
	contentMode: "body",
	requirePublished: false,
};

export const BLOG_COLLECTION: CollectionDescriptor = {
	name: "blog",
	contentDir: join("src", "content", "blog"),
	urlSegment: "blog",
	dateField: "pubDate",
	contentMode: "title",
	requirePublished: true,
};

export const SYNDICATABLE_COLLECTIONS: CollectionDescriptor[] = [
	EPHEMERA_COLLECTION,
	BLOG_COLLECTION,
];

export interface SyndicatableData {
	title?: string;
	date?: Date | string;
	pubDate?: Date | string;
	published?: boolean;
	syndication?: Array<{ href: string; title: string }>;
	image?: { src: string; alt: string };
}

export interface SyndicatablePost {
	file: string;
	collection: CollectionDescriptor;
	data: SyndicatableData;
	body: string;
	image?: SyndicatableData["image"];
}

export interface SyndicationResult {
	url?: string;
	success: boolean;
	platform: "mastodon" | "bluesky";
	error?: string;
}

export interface MockLogger {
	info: (message: string) => void;
	warn: (message: string) => void;
	error: (message: string) => void;
	debug: (message: string) => void;
}

export interface TestUtils {
	createMockLogger: () => MockLogger;
	createMockSyndicatablePost: (
		overrides?: Record<string, unknown>,
	) => SyndicatablePost;
	createMockConfig: () => {
		mastodon: { token: string; instance: string };
		bluesky: { username: string; password: string };
	};
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Validates and normalizes POSSE configuration
 */
export function validateConfig(
	options: PosseOptions = {},
): Omit<SyndicationContext, "logger"> {
	const { mastodon, bluesky, dryRun = false, maxPosts = 3 } = options;

	// Validate Mastodon configuration
	const mastodonEnabled = validateMastodonConfig(mastodon);

	// Validate Bluesky configuration
	const blueskyEnabled = validateBlueskyConfig(bluesky);

	return {
		mastodon: mastodonEnabled,
		bluesky: blueskyEnabled,
		dryRun,
		maxPosts,
	};
}

/**
 * Validates Mastodon configuration
 */
export function validateMastodonConfig(
	config?: Partial<PosseOptions["mastodon"]>,
): boolean {
	if (!config) return false;

	const { token, instance } = config;

	// Check if token is provided and has reasonable length
	if (!token || token.length < 10) {
		return false;
	}

	// Check if instance is provided and looks like a domain
	if (!instance || !instance.includes(".")) {
		return false;
	}

	return true;
}

/**
 * Validates Bluesky configuration
 */
export function validateBlueskyConfig(
	config?: Partial<PosseOptions["bluesky"]>,
): boolean {
	if (!config) return false;

	const { username, password } = config;

	// Check if both username and password are provided
	if (!username || !password) {
		return false;
	}

	// Basic validation - username should look like a handle
	if (!username.includes(".")) {
		return false;
	}

	return true;
}

/**
 * Gets platform configuration from environment variables
 */
export function getPlatformConfig(): {
	mastodon?: MastodonConfig | undefined;
	bluesky?: BlueskyConfig | undefined;
} {
	return {
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
	};
}

// ============================================================================
// FILE SCANNING
// ============================================================================

/**
 * Scans a content collection and returns recent posts that need syndication
 */
export function scanCollectionPosts(
	collection: CollectionDescriptor,
	maxPosts: number,
	logger: Logger,
): SyndicatablePost[] {
	try {
		const collectionDir = join(process.cwd(), collection.contentDir);
		// Legacy cutoff: only process posts from 2025-08-30 or newer
		const legacyCutoff = new Date("2025-08-30T00:00:00.000Z");

		logger.info(`POSSE: Legacy cutoff date: ${legacyCutoff.toISOString()}`);

		// Find all markdown files
		const markdownFiles = findMarkdownFiles(
			collectionDir,
			legacyCutoff,
			logger,
		);

		const recentPosts = markdownFiles
			.map((filePath) =>
				parsePostFile(filePath, collection, legacyCutoff, logger),
			)
			.filter((post): post is SyndicatablePost => post !== null)
			.slice(0, maxPosts);

		logger.info(
			`POSSE: Found ${recentPosts.length} recent ${collection.name} posts to process`,
		);

		return recentPosts;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(
			`POSSE: Failed to scan ${collection.name} posts: ${errorMessage}`,
		);
		return [];
	}
}

/**
 * Recursively finds all markdown files in the ephemera directory
 */
export function findMarkdownFiles(
	dir: string,
	legacyCutoff: Date,
	logger: Logger,
): string[] {
	const markdownFiles: string[] = [];

	function scanDirectory(currentDir: string) {
		try {
			const items = readdirSync(currentDir);

			// Filter and process items functionally
			const markdownItems = items
				.map((item) => {
					const fullPath = join(currentDir, item);
					const stat = statSync(fullPath);
					return { item, fullPath, stat };
				})
				.filter(({ item, stat }) => {
					if (stat.isDirectory()) {
						scanDirectory(join(currentDir, item));
						return false; // Don't include directories in results
					}
					return item.endsWith(".md");
				})
				.filter(({ item }) => {
					// Quick pre-filter: skip obviously old files by filename
					const filenameDateMatch = item.match(/(\d{4}-\d{2}-\d{2})/);
					if (filenameDateMatch && filenameDateMatch[1]) {
						const fileDate = new Date(filenameDateMatch[1]);
						return fileDate >= legacyCutoff;
					}
					return true; // Include files without date pattern
				})
				.map(({ fullPath }) => fullPath);

			markdownFiles.push(...markdownItems);
		} catch (error) {
			logger.warn(`POSSE: Could not scan directory ${currentDir}: ${error}`);
		}
	}

	scanDirectory(dir);
	return markdownFiles;
}

/**
 * Parses a single content file and determines if it needs syndication
 */
export function parsePostFile(
	filePath: string,
	collection: CollectionDescriptor,
	legacyCutoff: Date,
	logger: Logger,
): SyndicatablePost | null {
	try {
		const fileContent = readFileSync(filePath, "utf-8");
		const { data, content } = matter(fileContent);

		// Get relative path for logging
		const relativePath = filePath.replace(
			join(process.cwd(), collection.contentDir) + "/",
			"",
		);

		// Check if post is from cutoff date or newer (using collection's date field)
		const postDateValue = data[collection.dateField];
		const postDate = postDateValue ? new Date(postDateValue) : new Date(0);
		const isFromCutoffOrNewer = postDate >= legacyCutoff;

		if (!isFromCutoffOrNewer) {
			logger.debug(`POSSE: Skipping ${relativePath} - before legacy cutoff`);
			return null;
		}

		// Skip unpublished posts in collections that track a published flag
		if (collection.requirePublished && data.published === false) {
			logger.debug(`POSSE: Skipping ${relativePath} - not published`);
			return null;
		}

		// Check if already syndicated to ALL configured platforms
		const existingSyndication = data.syndication || [];
		const mastodonConfigured =
			!!process.env.MASTODON_ACCESS_TOKEN && !!process.env.MASTODON_INSTANCE;
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
			logger.debug(
				`POSSE: Skipping ${relativePath} - fully syndicated (${successfulSyndications}/${configuredCount} platforms)`,
			);
			return null;
		} else if (successfulSyndications > 0) {
			logger.debug(
				`POSSE: Will retry ${relativePath} - partially syndicated (${successfulSyndications}/${configuredCount} platforms)`,
			);
		}

		return {
			file: relativePath,
			collection,
			data,
			body: content || "",
			image: data.image,
		};
	} catch (error) {
		const relativePath = filePath.replace(
			join(process.cwd(), collection.contentDir) + "/",
			"",
		);
		logger.warn(`POSSE: Could not read ${relativePath}: ${error}`);
		return null;
	}
}

/**
 * Main POSSE integration for Astro
 */
export default function posseIntegration(
	options: PosseOptions = {},
): AstroIntegration {
	return {
		name: "posse-syndication",
		hooks: {
			"astro:build:done": async ({ logger }) => {
				await runSyndication(options, logger);
			},
		},
	};
}

/**
 * Main syndication workflow
 */
async function runSyndication(
	options: PosseOptions,
	astroLogger: Logger,
): Promise<void> {
	// Inject logger into our config system
	const baseContext = validateConfig(options);
	const context: SyndicationContext = {
		...baseContext,
		logger: astroLogger,
	};

	astroLogger.info("POSSE: Starting syndication process");

	try {
		await executeSyndication(context);
		astroLogger.info("POSSE: Syndication process completed successfully");
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		astroLogger.error(`POSSE: Syndication process failed: ${errorMessage}`);
	}
}

/**
 * Execute the syndication process
 */
async function executeSyndication(context: SyndicationContext): Promise<void> {
	const { mastodon, bluesky, dryRun, maxPosts, logger } = context;

	logger.info(
		`POSSE: Configuration - Mastodon: ${mastodon ? "enabled" : "disabled"}, Bluesky: ${bluesky ? "enabled" : "disabled"}, Dry Run: ${dryRun}`,
	);

	if (dryRun) {
		logger.info("POSSE: Running in DRY RUN mode - no actual posting");
	}

	// Get recent posts across all syndicable collections
	const recentPosts = SYNDICATABLE_COLLECTIONS.flatMap((collection) =>
		scanCollectionPosts(collection, maxPosts, logger),
	);

	if (recentPosts.length === 0) {
		logger.info("POSSE: No recent posts to syndicate");
		return;
	}

	logger.info(`POSSE: Processing ${recentPosts.length} posts`);

	// Process each post
	await Promise.all(
		recentPosts.map((post) => processSinglePost(post, context)),
	);

	logger.info("POSSE: Post processing complete");
}

/**
 * Process a single post from any syndicable collection
 */
async function processSinglePost(
	post: SyndicatablePost,
	context: SyndicationContext,
): Promise<void> {
	const { mastodon, bluesky, dryRun, logger } = context;

	const canonicalUrl = `https://ryanparsley.com/${post.collection.urlSegment}/${post.file.replace(".md", "")}`;
	const existingSyndication = post.data.syndication || [];

	// Check which platforms are already syndicated
	const hasMastodon = existingSyndication.some((s) => s.title === "Mastodon");
	const hasBluesky = existingSyndication.some((s) => s.title === "Bluesky");

	// Determine if we need to syndicate to any platforms
	const needsMastodon = mastodon && !hasMastodon;
	const needsBluesky = bluesky && !hasBluesky;

	if (!needsMastodon && !needsBluesky) {
		logger.debug(
			`POSSE: Skipping fully syndicated: ${post.data.title || post.file}`,
		);
		return;
	}

	const platformsToSyndicate: string[] = [];
	if (needsMastodon) platformsToSyndicate.push("Mastodon");
	if (needsBluesky) platformsToSyndicate.push("Bluesky");

	if (dryRun) {
		logger.info(
			`POSSE: DRY RUN - Would syndicate ${post.data.title || post.file} to: ${platformsToSyndicate.join(", ")}`,
		);
		return;
	}

	logger.info(
		`POSSE: Syndicating ${post.data.title || post.file} to: ${platformsToSyndicate.join(", ")}`,
	);

	// Compute syndication body based on collection's content mode
	const syndicationBody =
		post.collection.contentMode === "title"
			? (post.data.title ?? "")
			: post.body;

	// Perform syndication
	const syndicationResults = await syndicateToPlatforms(
		post,
		canonicalUrl,
		{ mastodon: needsMastodon, bluesky: needsBluesky },
		context,
		syndicationBody,
	);

	// Update post with syndication links
	if (syndicationResults.length > 0) {
		await updatePostWithSyndication(post, syndicationResults, logger);
	}
}

/**
 * Syndicate to configured platforms
 */
async function syndicateToPlatforms(
	post: SyndicatablePost,
	canonicalUrl: string,
	platforms: { mastodon: boolean; bluesky: boolean },
	context: SyndicationContext,
	syndicationBody: string,
): Promise<SyndicationResult[]> {
	const { logger } = context;
	const results: SyndicationResult[] = [];

	// Get platform configs
	const platformConfigs = getPlatformConfig();

	// Syndicate to Mastodon
	if (platforms.mastodon && platformConfigs.mastodon) {
		try {
			logger.debug("POSSE: Posting to Mastodon...");
			const result = await postToMastodon(
				post,
				canonicalUrl,
				platformConfigs.mastodon as MastodonConfig,
				logger,
				syndicationBody,
			);
			if (result.success && result.url) {
				results.push(result);
				logger.info(`POSSE: Successfully posted to Mastodon: ${result.url}`);
			} else {
				logger.warn(`POSSE: Mastodon syndication failed: ${result.error}`);
			}
		} catch (error) {
			logger.error(`POSSE: Mastodon syndication failed: ${error}`);
		}
	}

	// Syndicate to Bluesky
	if (platforms.bluesky && platformConfigs.bluesky) {
		try {
			logger.debug("POSSE: Posting to Bluesky...");
			const result = await postToBluesky(
				post,
				canonicalUrl,
				platformConfigs.bluesky as BlueskyConfig,
				logger,
				syndicationBody,
			);
			if (result.success && result.url) {
				results.push(result);
				logger.info(`POSSE: Successfully posted to Bluesky: ${result.url}`);
			} else {
				logger.warn(`POSSE: Bluesky syndication failed: ${result.error}`);
			}
		} catch (error) {
			logger.error(`POSSE: Bluesky syndication failed: ${error}`);
		}
	}

	return results;
}

/**
 * Update the post file with syndication links
 */
async function updatePostWithSyndication(
	post: SyndicatablePost,
	syndicationResults: SyndicationResult[],
	logger: Logger,
): Promise<void> {
	try {
		const sourcePath = join(
			process.cwd(),
			post.collection.contentDir,
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

		// Convert results to syndication format
		const syndicationUrls = syndicationResults
			.filter((result) => result.success && result.url)
			.map((result) => ({
				href: result.url!,
				title: result.platform === "mastodon" ? "Mastodon" : "Bluesky",
			}));

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

// ============================================================================
// CONTENT PROCESSING
// ============================================================================

/**
 * Generates platform-specific content for syndication
 */
export function generatePostContent(
	data: SyndicatableData,
	canonicalUrl: string,
	body: string,
	platform: "mastodon" | "bluesky",
): string {
	const initialContent = body?.trim()
		? cleanContentForSocial(body.trim(), platform)
		: "";
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

	// Log content lengths for debugging (only in development)
	if (platform === "bluesky" && process.env.NODE_ENV === "development") {
		console.log(
			`POSSE: Bluesky content lengths - content: ${content.length}, available: ${availableContentLength}, final: ${finalContent.length}, total: ${result.length}, max: ${maxLength}`,
		);
	}

	return result;
}

/**
 * Cleans markdown content for social media consumption
 */
export function cleanContentForSocial(
	markdown: string,
	platform: "mastodon" | "bluesky" = "mastodon",
): string {
	return markdown
		.replace(/^###\s+(.+)$/gm, "• $1") // ### Header → • Header
		.replace(/^##\s+(.+)$/gm, "$1") // ## Header → Header
		.replace(/^#\s+(.+)$/gm, "$1") // # Header → Header
		.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			platform === "bluesky" ? "$1 $2" : "$1",
		) // For Bluesky, keep URL in text for facets
		.replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold formatting
		.replace(/\*([^*]+)\*/g, "$1") // Remove italic formatting
		.replace(/```[\s\S]*?```/g, "[code block]") // Replace code blocks
		.replace(/\n\s*\n\s*\n/g, "\n\n") // Normalize multiple line breaks
		.replace(/[ \t]+/g, " ") // Normalize whitespace
		.trim();
}

// ============================================================================
// IMAGE PROCESSING UTILITIES
// ============================================================================

/**
 * Resolves image path based on source format
 */
export function resolveImagePath(src: string): string {
	return src.startsWith("./")
		? join(process.cwd(), "src", "content", "ephemera", src.slice(2))
		: src.startsWith("/")
			? join(process.cwd(), "public", src.slice(1))
			: join(process.cwd(), "src", "content", "ephemera", src);
}

/**
 * Selects the best available image source
 */
export function selectImageSource(
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
 * Creates the final image result object
 */
export function createImageResult(imageResult: {
	path: string;
	buffer: Buffer;
}): {
	path: string;
	size: number;
	mimeType: string;
} {
	return {
		path: imageResult.path,
		size: imageResult.buffer.length,
		mimeType: getMimeType(imageResult.path),
	};
}

/**
 * Checks if an image meets platform size limits
 */
export function checkImageSize(
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
			return "image/jpeg"; // fallback
	}
}
