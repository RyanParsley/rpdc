#!/usr/bin/env node

/* eslint-disable no-undef */

/**
 * @typedef {Object} EphemeraData
 * @property {string} [title] - Post title
 * @property {string} [description] - Post description
 * @property {Date|string|number} date - Publication date
 * @property {Array<{href: string, title: string}>} [syndication] - Syndication links
 * @property {string} [youtube] - YouTube video ID
 * @property {{src: string, alt: string}} [image] - Image data
 */

/**
 * @typedef {Object} EphemeraPost
 * @property {string} file - File path
 * @property {EphemeraData} data - Frontmatter data
 * @property {string} body - Markdown content
 * @property {{src: string, alt: string}} [image] - Image data
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join, extname } from "path";
import matter from "gray-matter";

/**
 * Handles syndication of ephemera posts to social media platforms
 */
class EphemeraSyndicator {
	/**
	 * @param {string} [mastodonToken] - Mastodon access token
	 * @param {string} [mastodonInstance] - Mastodon instance URL
	 * @param {string} [blueskyUsername] - Bluesky username/handle
	 * @param {string} [blueskyPassword] - Bluesky app password
	 * @param {boolean} [dryRun] - Whether to run in dry-run mode
	 */
	constructor() {
		/** @type {string|undefined} */
		this.mastodonToken = process.env.MASTODON_ACCESS_TOKEN;
		/** @type {string|undefined} */
		this.mastodonInstance = process.env.MASTODON_INSTANCE;
		/** @type {string|undefined} */
		this.blueskyUsername = process.env.BLUESKY_USERNAME;
		/** @type {string|undefined} */
		this.blueskyPassword = process.env.BLUESKY_PASSWORD;
		/** @type {boolean} */
		this.dryRun = process.env.SYNDICATION_DRY_RUN === "true";
	}

	/**
	 * Main syndication workflow - finds and syndicates new ephemera posts
	 * @returns {Promise<void>}
	 */
	async syndicateNewEphemera() {
		console.log(
			this.dryRun
				? "🔍 DRY RUN MODE: Detecting new ephemera posts (no actual posting)..."
				: "🔍 Detecting new ephemera posts...",
		);

		const newEphemera = this.findNewEphemera();

		if (newEphemera.length === 0) {
			console.log("ℹ️  No new ephemera posts to syndicate");
			return;
		}

		// SAFETY: Limit to maximum 3 posts per run to prevent spam
		const maxPosts = 3;
		const postsToSyndicate = newEphemera.slice(0, maxPosts);

		if (newEphemera.length > maxPosts) {
			console.log(
				`⚠️  Found ${newEphemera.length} posts but limiting to ${maxPosts} to prevent spam`,
			);
			console.log(
				"📋 Additional posts found:",
				newEphemera.slice(maxPosts).map((e) => e.data.title || e.file),
			);
		}

		console.log(
			`📝 Will syndicate ${postsToSyndicate.length} ephemera post(s) (max ${maxPosts} per run)`,
		);

		for (const ephemera of postsToSyndicate) {
			if (!ephemera.syndication || ephemera.syndication.length === 0) {
				if (this.dryRun) {
					console.log(
						`🔍 DRY RUN: Would syndicate: ${ephemera.data.title || ephemera.file}`,
					);
					if (ephemera.image) {
						console.log(`🖼️  Would include image: ${ephemera.image.src}`);
					}
					const canonicalUrl = this.getCanonicalUrl(ephemera.file);
					const mastodonPreview = this.generatePostContent(
						ephemera.data,
						canonicalUrl,
						ephemera.body,
						"mastodon",
					);
					const blueskyPreview = this.generatePostContent(
						ephemera.data,
						canonicalUrl,
						ephemera.body,
						"bluesky",
					);
					console.log(`🐘 Mastodon preview (${mastodonPreview.length} chars):`);
					console.log(
						`   ${mastodonPreview.split("\n").slice(0, 3).join("\n   ")}${mastodonPreview.split("\n").length > 3 ? "\n   ..." : ""}`,
					);
					console.log(`🦋 Bluesky preview (${blueskyPreview.length} chars):`);
					console.log(
						`   ${blueskyPreview.split("\n").slice(0, 3).join("\n   ")}${blueskyPreview.split("\n").length > 3 ? "\n   ..." : ""}`,
					);
				} else {
					console.log(
						`🚀 Syndicating: ${ephemera.data.title || ephemera.file}`,
					);
					await this.syndicateEphemera(ephemera);
					// Add small delay between posts to be respectful
					await new Promise((resolve) => setTimeout(resolve, 2000));
				}
			} else {
				console.log(
					`⏭️  Skipping ${ephemera.data.title || ephemera.file} - already syndicated`,
				);
			}
		}

		if (newEphemera.length > postsToSyndicate.length) {
			console.log(
				`📅 ${newEphemera.length - postsToSyndicate.length} posts queued for next run`,
			);
		}
	}

	/**
	 * Finds ephemera posts that need syndication
	 * @returns {EphemeraPost[]} Array of posts to syndicate
	 */
	findNewEphemera() {
		console.log("🔍 Checking for ephemera posts to syndicate...");

		// For frequent posting, use time-based approach
		// Syndicate posts from the last 24 hours that haven't been syndicated recently
		const allEphemera = this.findAllEphemera();
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		// Filter to recent posts that need syndication
		const postsToSyndicate = allEphemera.filter(({ data, file }) => {
			// Check if post is recent (last 24 hours)
			const postDate = data.date
				? new Date(data.date)
				: this.extractDateFromFilename(file);
			const isRecent = postDate > oneDayAgo;

			if (!isRecent) {
				return false; // Too old
			}

			// Check syndication status
			const hasRecentSyndication = this.hasRecentSyndication(data.syndication);

			if (hasRecentSyndication) {
				console.log(
					`⏭️  Skipping ${data.title || "untitled"} - recently syndicated`,
				);
				return false;
			}

			return true;
		});

		console.log(
			`📝 Found ${postsToSyndicate.length} recent ephemera posts to syndicate`,
		);
		return postsToSyndicate;
	}

	extractDateFromFilename(filename) {
		// Extract date from filename like "2025-08-30.md" or "2025/08/2025-08-30.md"
		const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
		if (dateMatch) {
			return new Date(dateMatch[1]);
		}
		return new Date(0); // Very old date if no date found
	}

	hasRecentSyndication(syndicationArray) {
		if (!syndicationArray || syndicationArray.length === 0) {
			return false;
		}

		// Consider it recently syndicated if there's any syndication data
		// In the future, we could add timestamps to syndication entries
		return true;
	}

	findAllEphemera() {
		// Fallback: check all ephemera files (simplified version)
		const ephemeraDir = "src/content/ephemera";
		try {
			const files = execSync(`find ${ephemeraDir} -name "*.md" -type f`, {
				encoding: "utf-8",
			})
				.split("\n")
				.filter(Boolean);

			return files.map((file) => {
				const fileContent = readFileSync(file, "utf-8");
				const { data, content: body } = matter(fileContent);
				return { file, data, body, image: data.image };
			});
		} catch {
			console.log("❌ Could not find ephemera files");
			return [];
		}
	}

	/**
	 * Syndicates a single ephemera post to all configured platforms
	 * @param {EphemeraPost} ephemera - The ephemera post to syndicate
	 * @returns {Promise<void>}
	 */
	async syndicateEphemera(ephemera) {
		const canonicalUrl = this.getCanonicalUrl(ephemera.file);
		const syndicationUrls = [];

		// Check if post has an image
		const hasImage = ephemera.image && ephemera.image.src;
		if (hasImage) {
			console.log("🖼️  Post includes image:", ephemera.image.src);
		}

		// Syndicate to Mastodon
		try {
			console.log("🐘 Posting to Mastodon...");
			const mastodonContent = this.generatePostContent(
				ephemera.data,
				canonicalUrl,
				ephemera.body,
				"mastodon",
			);
			const mastodonUrl = await this.postToMastodon(
				mastodonContent,
				ephemera.image,
			);
			syndicationUrls.push({
				href: mastodonUrl,
				title: "Mastodon",
			});
			console.log("✅ Posted to Mastodon:", mastodonUrl);
		} catch (error) {
			console.error("❌ Mastodon syndication failed:", error.message);
		}

		// Syndicate to Bluesky
		try {
			console.log("🦋 Posting to Bluesky...");
			const blueskyContent = this.generatePostContent(
				ephemera.data,
				canonicalUrl,
				ephemera.body,
				"bluesky",
			);
			const blueskyUrl = await this.postToBluesky(
				blueskyContent,
				ephemera.image,
			);
			syndicationUrls.push({
				href: blueskyUrl,
				title: "Bluesky",
			});
			console.log("✅ Posted to Bluesky:", blueskyUrl);
		} catch (error) {
			console.error("❌ Bluesky syndication failed:", error.message);
		}

		if (syndicationUrls.length > 0) {
			this.updateEphemeraFile(ephemera.file, syndicationUrls);
			console.log("💾 Updated ephemera file with syndication links");
			console.log(
				"⚠️  Note: Syndication links added but not committed to avoid branch protection issues",
			);
			console.log(
				"💡 To see syndication links, manually commit these changes or merge from a feature branch",
			);
		} else {
			console.log("⚠️  No successful syndications - file not updated");
			console.log("🔧 Check that credentials are properly configured:");
			console.log(
				`   - Mastodon: ${this.mastodonToken ? "✅" : "❌"} configured`,
			);
			console.log(
				`   - Bluesky: ${this.blueskyUsername && this.blueskyPassword ? "✅" : "❌"} configured`,
			);
		}
	}

	getCanonicalUrl(filePath) {
		// Convert file path to URL path
		const urlPath = filePath
			.replace("src/content/ephemera/", "/ephemera/")
			.replace(".md", "");
		return `https://ryanparsley.com${urlPath}`;
	}

	/**
	 * Generates platform-specific content for syndication
	 * @param {EphemeraData} data - Post frontmatter data
	 * @param {string} canonicalUrl - Canonical URL of the post
	 * @param {string} body - Markdown body content
	 * @param {string} [platform='mastodon'] - Target platform ('mastodon' or 'bluesky')
	 * @returns {string} Formatted content for the platform
	 */
	generatePostContent(data, canonicalUrl, body, platform = "mastodon") {
		// Use the actual post content if available, otherwise fall back to title
		let content = "";

		if (body && body.trim()) {
			// Clean up the markdown content for social media
			content = this.cleanContentForSocial(body.trim());
		}

		// If content is too short or empty, use title
		if (!content || content.length < 10) {
			content = data.title || "New ephemera post";
		}

		// Platform-specific length limits
		let maxLength;
		if (platform === "bluesky") {
			// Bluesky: 300 graphemes (approximately 280 characters to be safe)
			maxLength = 280;
		} else {
			// Mastodon: 500 characters
			maxLength = 400; // Leave room for URL
		}

		// Truncate if needed
		if (content.length > maxLength) {
			content = content.substring(0, maxLength - 3) + "...";
		}

		return `${content}\n\n${canonicalUrl}`;
	}

	cleanContentForSocial(markdown) {
		// Convert markdown to social media friendly format while preserving structure
		return (
			markdown
				// Convert headers to readable format
				.replace(/^###\s+(.+)$/gm, "• $1") // ### Header → • Header
				.replace(/^##\s+(.+)$/gm, "$1") // ## Header → Header
				.replace(/^#\s+(.+)$/gm, "$1") // # Header → Header
				// Keep links readable
				.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
				// Keep emphasis for readability (social platforms support basic formatting)
				// Remove code blocks but indicate they were there
				.replace(/```[\s\S]*?```/g, "[code block]")
				// Keep inline code as-is (social platforms handle this well)
				// Preserve paragraph breaks (double line breaks)
				.replace(/\n\s*\n\s*\n/g, "\n\n")
				// Clean up excessive whitespace but preserve single line breaks
				.replace(/[ \t]+/g, " ")
				// Remove excessive line breaks but keep paragraph structure
				.replace(/\n{3,}/g, "\n\n")
				.trim()
		);
	}

	async postToMastodon(content, image) {
		if (!this.mastodonToken || !this.mastodonInstance) {
			throw new Error("Mastodon credentials not configured");
		}

		let mediaId = null;

		// Upload image if present
		if (image && image.src) {
			try {
				console.log("📤 Uploading image to Mastodon...");
				mediaId = await this.uploadImageToMastodon(image);
				console.log("✅ Image uploaded to Mastodon");
			} catch (error) {
				console.warn(
					"⚠️  Image upload failed, posting text only:",
					error.message,
				);
			}
		}

		const requestBody = {
			status: content,
			visibility: "public",
		};

		// Add media attachment if we have one
		if (mediaId) {
			requestBody.media_ids = [mediaId];
			console.log(`🖼️  Attaching media ID: ${mediaId}`);
		}

		const response = await fetch(
			`https://${this.mastodonInstance}/api/v1/statuses`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.mastodonToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Mastodon API error: ${response.status} - ${error}`);
		}

		const data = await response.json();
		return data.url;
	}

	/**
	 * Uploads an image to Mastodon and returns the media ID
	 * @param {{src: string, alt: string}} image - Image data with src path and alt text
	 * @returns {Promise<string|null>} Media ID for attachment or null if failed
	 */
	async uploadImageToMastodon(image) {
		try {
			// Resolve the local image path
			let imagePath;
			if (image.src.startsWith("/")) {
				// Absolute path from site root
				imagePath = join(process.cwd(), "public", image.src);
			} else {
				// Relative path
				imagePath = join(process.cwd(), "public", image.src);
			}

			console.log(`📂 Reading image from: ${imagePath}`);

			// Read the image file
			const imageBuffer = readFileSync(imagePath);
			const imageExt = extname(image.src).toLowerCase();

			// Determine MIME type
			let mimeType;
			switch (imageExt) {
				case ".jpg":
				case ".jpeg":
					mimeType = "image/jpeg";
					break;
				case ".png":
					mimeType = "image/png";
					break;
				case ".gif":
					mimeType = "image/gif";
					break;
				case ".webp":
					mimeType = "image/webp";
					break;
				default:
					mimeType = "image/jpeg"; // fallback
			}

			// Create FormData for multipart upload
			const formData = new FormData();
			const blob = new Blob([imageBuffer], { type: mimeType });
			formData.append("file", blob, `image${imageExt}`);

			// Optional: Add description if available
			if (image.alt) {
				formData.append("description", image.alt);
			}

			// Upload to Mastodon
			const uploadResponse = await fetch(
				`https://${this.mastodonInstance}/api/v1/media`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.mastodonToken}`,
					},
					body: formData,
				},
			);

			if (!uploadResponse.ok) {
				const errorData = await uploadResponse.text();
				throw new Error(
					`Mastodon media upload failed: ${uploadResponse.status} - ${errorData}`,
				);
			}

			const mediaData = await uploadResponse.json();
			console.log(`✅ Image uploaded to Mastodon: ${mediaData.id}`);

			return mediaData.id;
		} catch (error) {
			console.error(`❌ Mastodon image upload failed:`, error.message);
			return null;
		}
	}

	async postToBluesky(content, image) {
		if (!this.blueskyUsername || !this.blueskyPassword) {
			throw new Error("Bluesky credentials not configured");
		}

		try {
			// Step 1: Authenticate and get session
			console.log("🔐 Authenticating with Bluesky...");
			const authResponse = await fetch(
				"https://bsky.social/xrpc/com.atproto.server.createSession",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						identifier: this.blueskyUsername,
						password: this.blueskyPassword,
					}),
				},
			);

			if (!authResponse.ok) {
				const errorData = await authResponse.text();
				throw new Error(
					`Bluesky auth failed: ${authResponse.status} - ${errorData}`,
				);
			}

			const session = await authResponse.json();
			console.log("✅ Bluesky authentication successful");

			let embed = undefined;

			// Handle image if present
			if (image && image.src) {
				try {
					console.log("📤 Uploading image to Bluesky...");
					const imageBlob = await this.uploadImageToBluesky(session, image);
					if (imageBlob) {
						embed = {
							$type: "app.bsky.embed.images",
							images: [
								{
									image: imageBlob,
									alt: image.alt || "Image from ephemera post",
								},
							],
						};
						console.log("✅ Image prepared for Bluesky post");
					}
				} catch (error) {
					console.warn(
						"⚠️  Image upload failed, posting text only:",
						error.message,
					);
				}
			}

			// Step 2: Create the post
			console.log("📝 Creating Bluesky post...");
			const postRecord = {
				text: content,
				createdAt: new Date().toISOString(),
			};

			if (embed) {
				postRecord.embed = embed;
			}

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
			const postUrl = `https://bsky.app/profile/${this.blueskyUsername}/post/${postData.uri.split("/").pop()}`;

			console.log("✅ Bluesky post created successfully");
			return postUrl;
		} catch (error) {
			console.error("❌ Bluesky posting error:", error.message);
			throw error;
		}
	}

	/**
	 * Uploads an image to Bluesky and returns the blob reference
	 * @param {Object} session - Bluesky authentication session
	 * @param {{src: string, alt: string}} image - Image data with src path and alt text
	 * @returns {Promise<Object|null>} Blob reference for embedding or null if failed
	 */
	async uploadImageToBluesky(session, image) {
		try {
			// Resolve the local image path
			let imagePath;
			if (image.src.startsWith("/")) {
				// Absolute path from site root
				imagePath = join(process.cwd(), "public", image.src);
			} else {
				// Relative path
				imagePath = join(process.cwd(), "public", image.src);
			}

			console.log(`📂 Reading image from: ${imagePath}`);

			// Read the image file
			const imageBuffer = readFileSync(imagePath);
			const imageExt = extname(image.src).toLowerCase();

			// Determine MIME type
			let mimeType;
			switch (imageExt) {
				case ".jpg":
				case ".jpeg":
					mimeType = "image/jpeg";
					break;
				case ".png":
					mimeType = "image/png";
					break;
				case ".gif":
					mimeType = "image/gif";
					break;
				case ".webp":
					mimeType = "image/webp";
					break;
				default:
					mimeType = "image/jpeg"; // fallback
			}

			// Upload as blob to Bluesky
			const blobResponse = await fetch(
				"https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${session.accessJwt}`,
						"Content-Type": mimeType,
					},
					body: imageBuffer,
				},
			);

			if (!blobResponse.ok) {
				const errorData = await blobResponse.text();
				throw new Error(
					`Bluesky blob upload failed: ${blobResponse.status} - ${errorData}`,
				);
			}

			const blobData = await blobResponse.json();
			console.log(`✅ Image uploaded to Bluesky as blob`);

			return blobData.blob;
		} catch (error) {
			console.error(`❌ Bluesky image upload failed:`, error.message);
			return null;
		}
	}

	updateEphemeraFile(filePath, syndicationUrls) {
		console.log(`💾 Updating file: ${filePath}`);
		console.log(`📋 Syndication URLs:`, syndicationUrls);

		const fileContent = readFileSync(filePath, "utf-8");
		const { data, content: body } = matter(fileContent);

		console.log(`📄 Original syndication:`, data.syndication);

		data.syndication = [...(data.syndication || []), ...syndicationUrls];

		console.log(`📝 Updated syndication:`, data.syndication);

		const updatedContent = matter.stringify(body, data);
		writeFileSync(filePath, updatedContent);

		console.log(`✅ File updated successfully: ${filePath}`);
	}
}

// Main execution
async function main() {
	try {
		const syndicator = new EphemeraSyndicator();
		await syndicator.syndicateNewEphemera();
	} catch (error) {
		console.error("💥 Syndication failed:", error);
		// Don't exit with error to avoid breaking CloudCannon build
	}
}

main();
