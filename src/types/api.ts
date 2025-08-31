/**
 * API-related types for external services (Mastodon, Bluesky)
 * Following Astro conventions for type organization
 */

// ============================================================================
// Mastodon API Types
// ============================================================================

/**
 * Mastodon status posting request body
 */
export interface MastodonStatusRequest {
	/** The text content of the status */
	status: string;
	/** Visibility of the status */
	visibility?: "public" | "unlisted" | "private" | "direct";
	/** Array of media attachment IDs */
	media_ids?: string[];
}

/**
 * Mastodon media upload response
 */
export interface MastodonMediaResponse {
	/** Unique identifier for the media attachment */
	id: string;
	/** Type of media (image, video, etc.) */
	type: string;
	/** URL of the uploaded media */
	url: string;
	/** URL of the preview image */
	preview_url: string;
}

/**
 * Mastodon status posting response
 */
export interface MastodonStatusResponse {
	/** Unique identifier for the status */
	id: string;
	/** URL of the posted status */
	url: string;
	/** Text content of the status */
	content: string;
	/** ISO timestamp of creation */
	created_at: string;
	/** Visibility setting */
	visibility: string;
	/** Array of media attachments */
	media_attachments?: Array<{
		id: string;
		type: string;
		url: string;
	}>;
}

/**
 * Mastodon API error response
 */
export interface MastodonErrorResponse {
	/** Error message */
	error: string;
	/** Additional error details */
	error_description?: string;
}

// ============================================================================
// Bluesky API Types
// ============================================================================

/**
 * Bluesky authentication request
 */
export interface BlueskyAuthRequest {
	/** User identifier (handle or email) */
	identifier: string;
	/** App password */
	password: string;
}

/**
 * Bluesky authentication response
 */
export interface BlueskyAuthResponse {
	/** Access JWT token */
	accessJwt: string;
	/** Refresh JWT token */
	refreshJwt: string;
	/** User's handle */
	handle: string;
	/** User's DID */
	did: string;
}

/**
 * Bluesky post record structure
 */
export interface BlueskyPostRecord {
	/** Text content of the post */
	text: string;
	/** ISO timestamp of creation */
	createdAt: string;
	/** Optional embed (images, links, etc.) */
	embed?: Record<string, unknown>;
}

/**
 * Bluesky post creation request
 */
export interface BlueskyPostRequest {
	/** Repository (user's DID) */
	repo: string;
	/** Collection type (should be "app.bsky.feed.post") */
	collection: "app.bsky.feed.post";
	/** Post record data */
	record: BlueskyPostRecord;
}

/**
 * Bluesky post creation response
 */
export interface BlueskyPostResponse {
	/** AT URI of the created post */
	uri: string;
	/** CID of the created post */
	cid: string;
}

/**
 * Bluesky blob upload response
 */
export interface BlueskyBlobResponse {
	/** Blob reference */
	blob: {
		$type: "blob";
		ref: {
			$link: string;
		};
		mimeType: string;
		size: number;
	};
}

/**
 * Bluesky API error response
 */
export interface BlueskyErrorResponse {
	/** Error message */
	error: string;
	/** Error type */
	message?: string;
}

// ============================================================================
// Generic API Types
// ============================================================================

/**
 * Generic API error response
 */
export interface ApiErrorResponse {
	/** Error message */
	error: string;
	/** Additional error details */
	message?: string;
	/** HTTP status code */
	status?: number;
}

/**
 * Generic API success response wrapper
 */
export interface ApiResponse<T> {
	/** Response data */
	data: T;
	/** Success flag */
	success: true;
}

/**
 * Generic API error response wrapper
 */
export interface ApiError {
	/** Error details */
	error: ApiErrorResponse;
	/** Success flag */
	success: false;
}

/**
 * Union type for API responses
 */
export type ApiResult<T> = ApiResponse<T> | ApiError;
