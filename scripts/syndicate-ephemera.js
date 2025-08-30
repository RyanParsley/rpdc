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
	}

	async syndicateNewEphemera() {
		console.log("🔍 Detecting new ephemera posts...");

		const newEphemera = this.findNewEphemera();

		if (newEphemera.length === 0) {
			console.log("ℹ️  No new ephemera posts to syndicate");
			return;
		}

		console.log(
			`📝 Found ${newEphemera.length} new ephemera post(s) to syndicate`,
		);

		for (const ephemera of newEphemera) {
			if (!ephemera.syndication || ephemera.syndication.length === 0) {
				console.log(`🚀 Syndicating: ${ephemera.title || ephemera.file}`);
				await this.syndicateEphemera(ephemera);
			} else {
				console.log(
					`⏭️  Skipping ${ephemera.title || ephemera.file} - already syndicated`,
				);
			}
		}
	}

	findNewEphemera() {
		try {
			// Get files changed in last commit
			const changedFiles = execSync("git diff --name-only HEAD~1", {
				encoding: "utf-8",
				stdio: "pipe",
			})
				.split("\n")
				.filter(
					(file) =>
						file.startsWith("src/content/ephemera/") && file.endsWith(".md"),
				);

			return changedFiles.map((file) => {
				const content = readFileSync(file, "utf-8");
				const { data } = matter(content);
				return { file, data };
			});
		} catch {
			// If git diff fails (e.g., no previous commit), check all ephemera files
			console.log(
				"⚠️  Could not determine changed files, checking all ephemera...",
			);
			return this.findAllEphemera();
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
				const content = readFileSync(file, "utf-8");
				const { data } = matter(content);
				return { file, data };
			});
		} catch {
			console.log("❌ Could not find ephemera files");
			return [];
		}
	}

	async syndicateEphemera(ephemera) {
		const canonicalUrl = this.getCanonicalUrl(ephemera.file);
		const postContent = this.generatePostContent(ephemera.data, canonicalUrl);

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

	generatePostContent(data, canonicalUrl) {
		const title = data.title || "New ephemera post";
		return `${title}\n\n${canonicalUrl}`;
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

	async postToBluesky() {
		if (!this.blueskyUsername || !this.blueskyPassword) {
			throw new Error("Bluesky credentials not configured");
		}

		// Simplified Bluesky posting - in production you'd want full AT Protocol implementation
		console.log(
			"🦋 Bluesky posting not yet implemented (would need AT Protocol client)",
		);
		return `https://bsky.app/profile/${this.blueskyUsername}/post/placeholder`;
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
