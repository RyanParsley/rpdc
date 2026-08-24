// POSSE Bluesky Module
// Handles Bluesky-specific posting logic

import {
	generatePostContent,
	type EphemeraPost,
	type Logger,
	type SyndicationResult,
} from "./posse";
import { processImageForPlatform } from "./image";

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
				body: new Uint8Array(imageBuffer),
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
