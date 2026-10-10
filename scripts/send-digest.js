/**
 * Weekly Digest Generator
 *
 * Collects blog posts, notes, and ephemera from the past week,
 * generates a Markdown digest, and sends it via Buttondown API.
 *
 * Usage:
 *   node scripts/send-digest.js            # send the digest
 *   node scripts/send-digest.js --dry-run  # print subject + body, send nothing
 *   node scripts/send-digest.js --draft    # create + delete a Buttondown draft
 *                                          # (server-verified contract check; nothing delivers)
 *
 * Env:
 *   BUTTONDOWN_API_KEY   required unless --dry-run
 *   DIGEST_CONTENT_ROOT  override the content directory (used by tests)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://ryanparsley.com";

// Configuration
const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;
const BUTTONDOWN_API_URL = "https://api.buttondown.com/v1";
// Buttondown versions v1 by date (Stripe-style), via the X-API-Version
// header; without it, requests resolve to the account pin or float on
// latest. Pin explicitly so the contract is deterministic; to upgrade,
// bump this and verify with --draft.
// https://docs.buttondown.com/api-versioning
const BUTTONDOWN_API_VERSION = "2026-04-01";

const DEFAULT_CONTENT_ROOT = path.join(__dirname, "../src/content");

/**
 * Get all markdown files from a directory recursively
 */
export function getMarkdownFiles(dir) {
	const files = [];
	if (!fs.existsSync(dir)) return files;

	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...getMarkdownFiles(fullPath));
		} else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
			files.push(fullPath);
		}
	}
	return files;
}

/**
 * A post is publishable unless frontmatter explicitly opts out.
 * Mirrors isPublished() in src/content.config.ts.
 */
export function isPublishable(frontmatter) {
	return frontmatter.published !== false;
}

/**
 * Get the publish/creation date from a file path or frontmatter
 */
export function getDateFromFile(filePath, frontmatter) {
	// Try frontmatter first
	if (frontmatter.pubDate) {
		const date = new Date(frontmatter.pubDate);
		if (!isNaN(date.getTime())) return date;
	}
	if (frontmatter.date) {
		const date = new Date(frontmatter.date);
		if (!isNaN(date.getTime())) return date;
	}

	// Try parsing from filename (e.g., 2026-02-28-hello-faircamp.md)
	const fileName = path.basename(filePath, path.extname(filePath));
	const dateMatch = fileName.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (dateMatch) {
		return new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
	}

	// Fall back to file modification time
	return new Date(fs.statSync(filePath).mtime);
}

/**
 * Extract title from markdown content
 */
export function getTitleFromContent(content, filePath) {
	// Try frontmatter
	const { data, content: body } = matter(content);
	if (data.title) return String(data.title).trim();

	// Try first h1 (in the body, not the frontmatter)
	const h1Match = body.match(/^#\s+(.+)$/m);
	if (h1Match) return h1Match[1].replace(/"/g, "").trim();

	// Fall back to filename
	return path.basename(filePath, path.extname(filePath));
}

/**
 * Get description from frontmatter or content
 */
export function getDescription(content) {
	const { data, content: body } = matter(content);
	if (data.description) return data.description;

	// Try to extract first paragraph after frontmatter
	const paragraphs = body.split(/\n\n+/);
	for (const p of paragraphs) {
		const trimmed = p.trim();
		if (trimmed && !trimmed.startsWith("#") && trimmed.length > 20) {
			// Remove markdown formatting and HTML entities
			return trimmed
				.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
				.replace(/[*_`#]/g, "")
				.replace(/&amp;/g, "&")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&39;/g, "'")
				.replace(/&quot;/g, '"');
		}
	}

	return "";
}

/**
 * Get tags from frontmatter
 */
export function getTags(frontmatter) {
	if (!frontmatter.tags) return [];
	if (Array.isArray(frontmatter.tags))
		return frontmatter.tags.map((t) => String(t).replace(/"/g, "").trim());
	if (typeof frontmatter.tags === "string") {
		return frontmatter.tags
			.replace(/[\]"[]/g, "")
			.split(",")
			.map((t) => t.trim().replace(/^#/, ""));
	}
	return [];
}

/**
 * Build URL from file path
 */
export function filePathToUrl(filePath, contentRoot = DEFAULT_CONTENT_ROOT) {
	const relative = path.relative(contentRoot, filePath);

	// Remove extension and convert to URL path
	// e.g., "blog/2025/2025-08-31-posse-astro-integration.md" → "/blog/2025/2025-08-31-posse-astro-integration"
	const withoutExt = relative.replace(/\.(md|mdx)$/, "");
	return `${SITE_URL}/${withoutExt}`;
}

/**
 * Format date for display
 */
export function formatDate(date) {
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/**
 * Collect content from past week
 */
export async function collectWeeklyContent(contentRoot = DEFAULT_CONTENT_ROOT) {
	const oneWeekAgo = new Date();
	oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

	const content = {
		blog: [],
		note: [],
		ephemera: [],
	};

	// Collect blog posts
	const blogFiles = getMarkdownFiles(path.join(contentRoot, "blog"));
	for (const file of blogFiles) {
		const fileContent = fs.readFileSync(file, "utf-8");
		const { data: frontmatter } = matter(fileContent);
		if (!isPublishable(frontmatter)) continue;
		const date = getDateFromFile(file, frontmatter);

		if (date >= oneWeekAgo) {
			content.blog.push({
				title: getTitleFromContent(fileContent, file),
				url: filePathToUrl(file, contentRoot),
				date,
				description: getDescription(fileContent),
				tags: getTags(frontmatter),
				type: "blog",
			});
		}
	}

	// Collect notes
	const noteFiles = getMarkdownFiles(path.join(contentRoot, "note"));
	for (const file of noteFiles) {
		// Skip subdirectories that are treated as collections (violin, mpcnc, etc.)
		const relative = path.relative(path.join(contentRoot, "note"), file);
		if (relative.includes("/")) continue;

		const fileContent = fs.readFileSync(file, "utf-8");
		const { data: frontmatter } = matter(fileContent);
		if (!isPublishable(frontmatter)) continue;
		const date = getDateFromFile(file, frontmatter);

		if (date >= oneWeekAgo) {
			content.note.push({
				title: getTitleFromContent(fileContent, file),
				url: filePathToUrl(file, contentRoot),
				date,
				description: getDescription(fileContent),
				tags: getTags(frontmatter),
				type: "note",
			});
		}
	}

	// Collect ephemera
	const ephemeraFiles = getMarkdownFiles(path.join(contentRoot, "ephemera"));
	for (const file of ephemeraFiles) {
		const fileContent = fs.readFileSync(file, "utf-8");
		const { data: frontmatter } = matter(fileContent);
		const date = getDateFromFile(file, frontmatter);

		if (date >= oneWeekAgo) {
			// Ephemera uses slug as title if no title in frontmatter
			const slug = path.basename(file, path.extname(file));
			content.ephemera.push({
				title: frontmatter.title || slug,
				url: filePathToUrl(file, contentRoot),
				date,
				description: getDescription(fileContent),
				tags: getTags(frontmatter),
				syndication: Array.isArray(frontmatter.syndication)
					? frontmatter.syndication
					: [],
				type: "ephemera",
			});
		}
	}

	return content;
}

/**
 * Generate Markdown digest
 */
export function generateMarkdownDigest(content) {
	const now = new Date();
	const weekStart = new Date(now);
	weekStart.setDate(weekStart.getDate() - 7);

	const dateRange = `${formatDate(weekStart)} - ${formatDate(now)}`;

	let markdown = `📝 **Weekly Digest**
================

${dateRange}
`;

	// Blog posts
	if (content.blog.length > 0) {
		markdown += `\n## 📌 Blog\n`;
		for (const item of content.blog) {
			markdown += `\n### [${item.title}](${item.url})\n`;
			markdown += `*blog* • ${formatDate(item.date)}\n`;
			if (item.description) {
				markdown += `\n${item.description}\n`;
			}
			if (item.tags.length > 0) {
				markdown += `\nTags: ${item.tags.map((t) => `#${t}`).join(", ")}\n`;
			}
			markdown += `\n---\n`;
		}
	}

	// Notes
	if (content.note.length > 0) {
		markdown += `\n## 📌 Note\n`;
		for (const item of content.note) {
			markdown += `\n### [${item.title}](${item.url})\n`;
			markdown += `*note* • ${formatDate(item.date)}\n`;
			if (item.description) {
				markdown += `\n${item.description}\n`;
			}
			if (item.tags.length > 0) {
				markdown += `\nTags: ${item.tags.map((t) => `#${t}`).join(", ")}\n`;
			}
			markdown += `\n---\n`;
		}
	}

	// Ephemera
	if (content.ephemera.length > 0) {
		markdown += `\n## 📌 Ephemera\n`;
		for (const item of content.ephemera) {
			markdown += `\n### [${item.title}](${item.url})\n`;
			markdown += `*ephemera* • ${formatDate(item.date)}\n`;
			if (item.description) {
				markdown += `\n${item.description}\n`;
			}
			if (item.syndication?.length > 0) {
				markdown += `\nAlso on: ${item.syndication.map((s) => `[${s.title}](${s.href})`).join(" · ")}\n`;
			}
			markdown += `\n---\n`;
		}
	}

	// Footer
	markdown += `\nThis weekly digest is automatically generated from my blog, notes, and ephemera. [Visit ryanparsley.com](${SITE_URL}) to read more.\n`;

	return markdown;
}

/**
 * Send email via Buttondown API.
 * status "about_to_send" delivers to subscribers; "draft" creates a draft only.
 */
export async function sendEmail(
	subject,
	body,
	{ apiKey = BUTTONDOWN_API_KEY, status = "about_to_send" } = {},
) {
	const response = await fetch(`${BUTTONDOWN_API_URL}/emails`, {
		method: "POST",
		headers: {
			Authorization: `Token ${apiKey}`,
			"Content-Type": "application/json",
			"X-API-Version": BUTTONDOWN_API_VERSION,
			"User-Agent": "RyanParsleyDotCom/1.0",
		},
		body: JSON.stringify({
			subject,
			body,
			email_type: "public",
			status,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Buttondown API error: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data;
}

/**
 * Delete an email (used to clean up drafts created by --draft).
 */
export async function deleteEmail(id, apiKey = BUTTONDOWN_API_KEY) {
	const response = await fetch(`${BUTTONDOWN_API_URL}/emails/${id}`, {
		method: "DELETE",
		headers: {
			Authorization: `Token ${apiKey}`,
			"X-API-Version": BUTTONDOWN_API_VERSION,
			"User-Agent": "RyanParsleyDotCom/1.0",
		},
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Buttondown API error: ${response.status} - ${error}`);
	}
}

/**
 * Create a Buttondown draft and immediately delete it: a server-verified
 * smoke test of the send path (auth, endpoint, payload validation) that
 * never delivers anything and leaves no residue.
 */
export async function createAndVerifyDraft(
	subject,
	body,
	apiKey = BUTTONDOWN_API_KEY,
) {
	const draft = await sendEmail(subject, body, { apiKey, status: "draft" });
	await deleteEmail(draft.id, apiKey);
	return draft;
}

/**
 * Main function
 */
async function main() {
	const isDryRun = process.argv.includes("--dry-run");
	const isDraft = process.argv.includes("--draft");

	console.log("📝 Starting weekly digest generation...\n");

	try {
		// Collect content from past week
		console.log("🔍 Collecting content from the past week...");
		const content = await collectWeeklyContent(process.env.DIGEST_CONTENT_ROOT);

		const totalItems =
			content.blog.length + content.note.length + content.ephemera.length;

		console.log(
			`   Found ${content.blog.length} blog posts, ${content.note.length} notes, ${content.ephemera.length} ephemera\n`,
		);

		// Skip if no content
		if (totalItems === 0) {
			console.log("📭 No new content this week. Skipping email.\n");
			return;
		}

		// Generate digest
		console.log("📄 Generating Markdown digest...");
		const body = generateMarkdownDigest(content);

		// Generate subject line
		const now = new Date();
		const weekStart = new Date(now);
		weekStart.setDate(weekStart.getDate() - 7);
		const subject = `Weekly Digest: ${weekStart.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		})} - ${now.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		})}`;

		console.log(`   Subject: ${subject}\n`);

		if (isDryRun) {
			console.log("=== SUBJECT ===");
			console.log(subject);
			console.log("=== BODY ===");
			console.log(body);
			console.log("🏜️  Dry run — no email sent.");
			return;
		}

		if (!BUTTONDOWN_API_KEY) {
			console.error("❌ BUTTONDOWN_API_KEY environment variable is required");
			process.exit(1);
		}

		if (isDraft) {
			console.log(
				"🌱 Draft mode: verifying the Buttondown contract (create + delete draft, nothing delivers)",
			);
			const draft = await createAndVerifyDraft(subject, body);
			console.log(`   Draft ${draft.id} created and deleted ✔`);
			console.log(`   Subject: ${subject}\n`);
			return;
		}

		// Send email
		console.log("🚀 Sending email via Buttondown API...");
		const result = await sendEmail(subject, body);

		console.log(`✅ Email sent successfully!`);
		console.log(`   Email ID: ${result.id}`);
		console.log(`   URL: ${result.absolute_url}\n`);
	} catch (error) {
		console.error(`❌ Error: ${error.message}`);
		process.exit(1);
	}
}

// Run only when executed directly (keeps imports side-effect-free for tests)
const isMainModule =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
	main();
}
