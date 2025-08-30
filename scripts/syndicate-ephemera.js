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
		try {
			// Get files changed in last commit that are ephemera posts
			console.log("🔍 Checking for new ephemera posts...");

			const changedFiles = execSync("git diff --name-only HEAD~1", {
				encoding: "utf-8",
				stdio: "pipe",
			})
				.split("\n")
				.filter(
					(file) =>
						file &&
						file.startsWith("src/content/ephemera/") &&
						file.endsWith(".md") &&
						!file.includes("node_modules"),
				);

			console.log(
				`📝 Found ${changedFiles.length} changed ephemera files:`,
				changedFiles,
			);

			// Filter to only truly new posts (no existing syndication)
			const newPosts = changedFiles
				.map((file) => {
					const fileContent = readFileSync(file, "utf-8");
					const { data, content: body } = matter(fileContent);
					return { file, data, body };
				})
				.filter(({ data }) => {
					// Only syndicate if there's no syndication data yet
					const hasSyndication =
						data.syndication && data.syndication.length > 0;
					if (hasSyndication) {
						console.log(
							`⏭️  Skipping ${data.title || "untitled"} - already syndicated`,
						);
						return false;
					}
					return true;
				});

			console.log(`🚀 Will syndicate ${newPosts.length} new posts`);
			return newPosts;
		} catch (error) {
			console.log(
				"⚠️  Git diff failed, checking recent commits...",
				error.message,
			);

			// Try a different approach - check recent commits for ephemera files
			try {
				const recentFiles = execSync(
					"git log --name-only --oneline -5 | grep 'src/content/ephemera/.*\\.md$' | head -5",
					{
						encoding: "utf-8",
						stdio: "pipe",
					},
				)
					.split("\n")
					.filter(
						(file) =>
							file &&
							file.startsWith("src/content/ephemera/") &&
							file.endsWith(".md"),
					)
					.filter((file, index, arr) => arr.indexOf(file) === index); // Remove duplicates

				console.log(
					`📝 Found ${recentFiles.length} recent ephemera files:`,
					recentFiles,
				);

				return recentFiles
					.map((file) => {
						try {
							const fileContent = readFileSync(file, "utf-8");
							const { data, content: body } = matter(fileContent);
							return { file, data, body };
						} catch {
							console.log(`⚠️  Could not read ${file}`);
							return null;
						}
					})
					.filter((item) => item !== null)
					.filter(({ data }) => {
						const hasSyndication =
							data.syndication && data.syndication.length > 0;
						if (hasSyndication) {
							console.log(
								`⏭️  Skipping ${data.title || "untitled"} - already syndicated`,
							);
							return false;
						}
						return true;
					});
			} catch (fallbackError) {
				console.log(
					"⚠️  Fallback also failed, checking all ephemera files...",
					fallbackError.message,
				);
				return this.findAllEphemera();
			}
		}
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
		const fileContent = readFileSync(filePath, "utf-8");
		const { data, content: body } = matter(fileContent);

		data.syndication = [...(data.syndication || []), ...syndicationUrls];

		const updatedContent = matter.stringify(body, data);
		writeFileSync(filePath, updatedContent);
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
