#!/usr/bin/env node

/**
 * PESOS Mastodon Fetcher
 *
 * Fetches recent Mastodon posts and helps convert them to ephemera.
 * Filters out:
 *   - Boosts (not your content)
 *   - Posts that link to your site (these were POSSEd from your site)
 *   - Posts already in ephemera
 *
 * Usage:
 *   node scripts/pesos-mastodon.js
 */

/* eslint-env node */
/* global console, process, fetch, URL */

import {
	readFileSync,
	existsSync,
	mkdirSync,
	writeFileSync,
	readdirSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const SITE_URL = process.env.SITE_URL || "https://ryanparsley.com";

// Load env from ~/.env if not already set
(function loadEnv() {
	const envPath = join(process.env.HOME, ".env");
	if (!existsSync(envPath)) return;

	const envContent = readFileSync(envPath, "utf-8");
	envContent.split("\n").forEach((line) => {
		const match = line.match(/^export\s+([A-Z_]+)=(.*)$/);
		if (match && !process.env[match[1]]) {
			process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
		}
	});
})();

const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
};

function prompt(question) {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

async function fetchMastodonPosts() {
	const instance = process.env.MASTODON_INSTANCE;
	const token = process.env.MASTODON_ACCESS_TOKEN;

	if (!instance || !token) {
		console.error(
			`${colors.red}❌ Missing MASTODON_INSTANCE or MASTODON_ACCESS_TOKEN${colors.reset}`,
		);
		process.exit(1);
	}

	console.log(
		`${colors.cyan}Fetching recent posts from ${instance}...${colors.reset}`,
	);

	// First, get the current user's account ID
	const accountResponse = await fetch(
		`https://${instance}/api/v1/accounts/verify_credentials`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);

	if (!accountResponse.ok) {
		console.error(
			`${colors.red}❌ Failed to verify credentials: ${accountResponse.statusText}${colors.reset}`,
		);
		process.exit(1);
	}

	const account = await accountResponse.json();
	const accountId = account.id;
	const username = account.username;

	console.log(`Logged in as @${username}@${instance}\n`);

	// Fetch recent posts
	const postsResponse = await fetch(
		`https://${instance}/api/v1/accounts/${accountId}/statuses?limit=40`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);

	if (!postsResponse.ok) {
		console.error(
			`${colors.red}❌ Failed to fetch posts: ${postsResponse.statusText}${colors.reset}`,
		);
		process.exit(1);
	}

	const posts = await postsResponse.json();
	return posts;
}

function getExistingSyndicationUrls() {
	const ephemeraPath = join(projectRoot, "src/content/ephemera");
	const urls = new Set();

	if (!existsSync(ephemeraPath)) {
		return urls;
	}

	function walkDir(dir) {
		const files = readdirSync(dir, { withFileTypes: true });
		for (const file of files) {
			const fullPath = join(dir, file.name);
			if (file.isDirectory()) {
				walkDir(fullPath);
			} else if (file.name.endsWith(".md")) {
				try {
					const content = readFileSync(fullPath, "utf-8");
					const urlMatch = content.match(/href:\s*['"]([^'"]+)['"]/g);
					if (urlMatch) {
						for (const match of urlMatch) {
							const url = match.match(/href:\s*['"]([^'"]+)['"]/)?.[1];
							if (url && url.includes("mastodon.social")) {
								urls.add(url);
							}
						}
					}
				} catch {
					// Skip files that can't be read
				}
			}
		}
	}

	walkDir(ephemeraPath);
	return urls;
}

function filterPosts(posts, existingUrls) {
	const siteDomain = new URL(SITE_URL).hostname;

	return posts.filter((post) => {
		// Skip boosts
		if (post.reblog) {
			return false;
		}

		// Skip if already in ephemera
		const postUrl = post.url || post.uri;
		if (existingUrls.has(postUrl)) {
			return false;
		}

		// Skip if it links back to our site (POSSEd from our site)
		const content = (post.content || "").toLowerCase();
		if (content.includes(siteDomain)) {
			return false;
		}

		return true;
	});
}

function formatPostDate(dateString) {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function truncateContent(content, maxLength = 80) {
	// Strip HTML tags
	const plainText = content.replace(/<[^>]*>/g, "");
	if (plainText.length <= maxLength) {
		return plainText;
	}
	return plainText.substring(0, maxLength).trim() + "...";
}

async function selectPosts(posts) {
	console.log(
		`${colors.yellow}Recent Mastodon posts (excluding POSSEd and boosts):${colors.reset}\n`,
	);

	posts.forEach((post, index) => {
		const date = formatPostDate(post.created_at);
		const preview = truncateContent(post.content);
		const mediaCount =
			(post.media_attachments?.length || 0) + (post.card ? 1 : 0);
		const mediaIndicator = mediaCount > 0 ? ` [${mediaCount} media]` : "";

		console.log(
			`${colors.cyan}[${index + 1}]${colors.reset} ${date}${mediaIndicator}`,
		);
		console.log(`    ${preview}`);
		console.log();
	});

	console.log(
		`${colors.yellow}Select posts to convert to ephemera:${colors.reset}`,
	);
	console.log(`  • Enter numbers separated by commas: 1,3,5`);
	console.log(`  • Or 'all' to convert everything`);
	console.log(`  • Or press Enter to cancel\n`);

	const selection = await prompt(`${colors.cyan}Selection:${colors.reset} `);

	if (!selection) {
		return [];
	}

	if (selection.toLowerCase() === "all") {
		return posts;
	}

	const selected = [];
	const indices = selection.split(",").map((s) => parseInt(s.trim(), 10));

	for (const index of indices) {
		if (index > 0 && index <= posts.length) {
			selected.push(posts[index - 1]);
		} else {
			console.log(`${colors.yellow}⚠️  Invalid index: ${index}${colors.reset}`);
		}
	}

	return selected;
}

function createEphemeraFile(post) {
	const date = new Date(post.created_at);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");

	const timestamp = `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;

	const dirPath = join(
		projectRoot,
		"src/content/ephemera",
		String(year),
		month,
		day,
	);
	mkdirSync(dirPath, { recursive: true });

	const filename = `${timestamp}.md`;
	const filepath = join(dirPath, filename);

	// Convert HTML content to markdown-like plain text
	let content = post.content || "";
	// Strip HTML but preserve line breaks
	content = content.replace(/<br\s*\/?>/gi, "\n");
	content = content.replace(/<[^>]*>/g, "");
	content = content.trim();

	// Handle media attachments - include as note in content
	const mediaAttachments = post.media_attachments || [];
	for (const media of mediaAttachments) {
		if (media.type === "image") {
			content += `\n\n[Image: ${media.description || "no description"}]`;
		} else if (media.type === "video" || media.type === "gifv") {
			content += `\n\n[Video/GIF: ${media.description || "no description"}]`;
		}
	}

	// Handle link preview
	if (post.card) {
		content += `\n\n[Link: ${post.card.title} - ${post.card.url}]`;
	}

	const fileContent = `---
date: '${post.created_at}'
syndication:
  - href: '${post.url || post.uri}'
    title: Mastodon
---

${content}
`;

	writeFileSync(filepath, fileContent, "utf-8");
	return filepath;
}

async function main() {
	console.log(
		`${colors.cyan}${colors.bright}🪶 PESOS Mastodon Fetcher${colors.reset}`,
	);
	console.log(
		`${colors.blue}Find Mastodon posts to convert to ephemera${colors.reset}\n`,
	);

	const posts = await fetchMastodonPosts();
	console.log(`Found ${posts.length} total posts\n`);

	const existingUrls = getExistingSyndicationUrls();
	console.log(
		`Found ${existingUrls.size} existing syndication links in ephemera\n`,
	);

	const eligiblePosts = filterPosts(posts, existingUrls);

	if (eligiblePosts.length === 0) {
		console.log(`${colors.yellow}No posts to convert!${colors.reset}`);
		console.log(
			`${colors.blue}All recent posts either link to your site or are already in ephemera.${colors.reset}`,
		);
		process.exit(0);
	}

	console.log(
		`${colors.green}Found ${eligiblePosts.length} eligible posts${colors.reset}\n`,
	);

	const selected = await selectPosts(eligiblePosts);

	if (selected.length === 0) {
		console.log(`${colors.yellow}No posts selected.${colors.reset}`);
		process.exit(0);
	}

	console.log(
		`\n${colors.green}Creating ${selected.length} ephemera files...${colors.reset}\n`,
	);

	const created = [];
	for (const post of selected) {
		try {
			const filepath = createEphemeraFile(post);
			created.push(filepath);
			console.log(`${colors.green}✅${colors.reset} ${filepath}`);
		} catch (error) {
			console.log(
				`${colors.red}❌${colors.reset} Failed to create file: ${error.message}`,
			);
		}
	}

	console.log(
		`\n${colors.green}🎉 Created ${created.length} ephemera files!${colors.reset}`,
	);
	console.log(`${colors.blue}Next steps:${colors.reset}`);
	console.log(`  1. Review the files in src/content/ephemera/`);
	console.log(`  2. Edit content if needed`);
	console.log(`  3. Run 'npm run build' to test`);
	console.log(`  4. Commit and push to syndicate`);
}

main().catch((error) => {
	console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
	process.exit(1);
});
