/**
 * Shared types for POSSE (Publish on your Own Site, Syndicate Elsewhere) integration
 * Following Astro conventions for type organization
 */

// ============================================================================
// Core POSSE Types
// ============================================================================

/**
 * Configuration options for the POSSE integration
 */
export interface PosseOptions {
	/** Mastodon syndication configuration */
	mastodon?: MastodonConfig;
	/** Bluesky syndication configuration */
	bluesky?: BlueskyConfig;
	/** Whether to run in dry-run mode (no actual posting) */
	dryRun?: boolean;
	/** Maximum number of posts to process per run */
	maxPosts?: number;
}

/**
 * Mastodon API configuration
 */
export interface MastodonConfig {
	/** Mastodon access token */
	token: string;
	/** Mastodon instance URL (e.g., "mastodon.social") */
	instance: string;
}

/**
 * Bluesky API configuration
 */
export interface BlueskyConfig {
	/** Bluesky username/handle */
	username: string;
	/** Bluesky app password */
	password: string;
}

// ============================================================================
// Content Types
// ============================================================================

/**
 * Image data structure used across the application
 */
export interface ImageData {
	/** Image source URL */
	readonly src: string;
	/** Alt text for accessibility */
	readonly alt: string;
}

/**
 * Syndication link structure
 */
export interface SyndicationLink {
	/** URL of the syndicated post */
	readonly href: string;
	/** Title/name of the platform (e.g., "Mastodon", "Bluesky") */
	readonly title: string;
}

/**
 * Frontmatter data for ephemera posts
 */
export interface EphemeraData {
	/** Post title */
	title?: string;
	/** Publication date */
	date?: Date | string;
	/** Array of syndication links */
	syndication?: ReadonlyArray<SyndicationLink>;
	/** Associated image data */
	image?: ImageData;
}

/**
 * Complete ephemera post structure
 */
export interface EphemeraPost {
	/** Relative file path */
	readonly file: string;
	/** Parsed frontmatter data */
	readonly data: EphemeraData;
	/** Markdown content body */
	readonly body: string;
	/** Associated image (convenience property) */
	readonly image?: ImageData;
}

// ============================================================================
// Test Utilities Types
// ============================================================================

/**
 * Mock logger interface for testing
 */
export interface MockLogger {
	info: (...args: unknown[]) => void;
	warn: (...args: unknown[]) => void;
	error: (...args: unknown[]) => void;
	debug: (...args: unknown[]) => void;
}

/**
 * Test utilities for POSSE integration testing
 */
export interface TestUtils {
	createMockLogger: () => MockLogger;
	createMockEphemeraPost: (
		overrides?: Record<string, unknown>,
	) => Record<string, unknown>;
	createMockConfig: () => Record<string, unknown>;
}
