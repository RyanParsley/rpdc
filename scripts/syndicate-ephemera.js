#!/usr/bin/env node

/* eslint-disable no-undef */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import matter from "gray-matter";

class EphemeraSyndicator {
	constructor() {
		this.mastodonToken = process.env.MASTODON_ACCESS_TOKEN;
		this.mastodonInstance = process.env.MASTODON_INSTANCE;
		this.blueskyUsername = process.env.BLUESKY_USERNAME;
		this.blueskyPassword = process.env.BLUESKY_PASSWORD;
		this.dryRun = process.env.SYNDICATION_DRY_RUN === "true";
	}

	async syndicateNewEphemera() {
		if (this.dryRun) {
			console.log(
				"🔍 DRY RUN MODE: Detecting new ephemera posts (no actual posting)...",
			);
		} else {
			console.log("🔍 Detecting new ephemera posts...");
		}

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
					console.log(
						`📝 Content preview: ${this.generatePostContent(ephemera.data, this.getCanonicalUrl(ephemera.file), ephemera.body).substring(0, 100)}...`,
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
				return { file, data, body };
			});
		} catch {
			console.log("❌ Could not find ephemera files");
			return [];
		}
	}

	async syndicateEphemera(ephemera) {
		const canonicalUrl = this.getCanonicalUrl(ephemera.file);
		const postContent = this.generatePostContent(
			ephemera.data,
			canonicalUrl,
			ephemera.body,
		);

		const syndicationUrls = [];

		// Syndicate to Mastodon
		try {
			console.log("🐘 Posting to Mastodon...");
			const mastodonUrl = await this.postToMastodon(postContent);
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
			const blueskyUrl = await this.postToBluesky(postContent);
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
		}
	}

	getCanonicalUrl(filePath) {
		// Convert file path to URL path
		const urlPath = filePath
			.replace("src/content/ephemera/", "/ephemera/")
			.replace(".md", "");
		return `https://ryanparsley.com${urlPath}`;
	}

	generatePostContent(data, canonicalUrl, body) {
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

		// Mastodon has a 500 character limit, so truncate if needed
		const maxLength = 400; // Leave room for URL
		if (content.length > maxLength) {
			content = content.substring(0, maxLength - 3) + "...";
		}

		return `${content}\n\n${canonicalUrl}`;
	}

	cleanContentForSocial(markdown) {
		// Remove markdown formatting for social media
		return (
			markdown
				// Remove headers
				.replace(/^#+\s*/gm, "")
				// Remove links but keep text
				.replace(/\[([^]]+)\]\([^)]+\)/g, "$1")
				// Remove emphasis
				.replace(/\*\*([^*]+)\*\*/g, "$1")
				.replace(/\*([^*]+)\*/g, "$1")
				// Remove code blocks
				.replace(/```[\s\S]*?```/g, "")
				.replace(/`([^`]+)`/g, "$1")
				// Clean up extra whitespace
				.replace(/\n\s*\n/g, "\n")
				.trim()
		);
	}

	async postToMastodon(content) {
		if (!this.mastodonToken || !this.mastodonInstance) {
			throw new Error("Mastodon credentials not configured");
		}

		const response = await fetch(
			`https://${this.mastodonInstance}/api/v1/statuses`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.mastodonToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					status: content,
					visibility: "public",
				}),
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Mastodon API error: ${response.status} - ${error}`);
		}

		const data = await response.json();
		return data.url;
	}

	async postToBluesky(content) {
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

			// Step 2: Create the post
			console.log("📝 Creating Bluesky post...");
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
						record: {
							text: content,
							createdAt: new Date().toISOString(),
						},
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
