// POSSE Mastodon Module
// Handles Mastodon-specific posting logic

import { readFileSync } from "fs";
import {
	generatePostContent,
	type EphemeraPost,
	type Logger,
	type SyndicationResult,
} from "./posse";
import { processImageForPlatform, getExtensionFromMimeType } from "./image";

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
