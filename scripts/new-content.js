#!/usr/bin/env node

/**
 * Astro Content Generator
 *
 * Generates new content following Astro content collection conventions.
 * Supports blog posts, notes, and ephemera.
 *
 * Usage:
 *   npm run new-content
 *   npm run new-content -- --type blog
 *   npm run new-content -- --type note
 *   npm run new-content -- --type ephemera
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// ANSI color codes for better console output
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

/**
 * Content type configurations
 */
const contentTypes = {
	blog: {
		path: "src/content/blog",
		schema: {
			required: ["title", "description", "pubDate"],
			optional: ["tags", "OGImage", "heroImage", "featured"],
		},
		getPath: (data) => {
			const year = new Date(data.pubDate).getFullYear();
			return `src/content/blog/${year}`;
		},
		template: (data) => `---
title: "${data.title}"
description: "${data.description}"
pubDate: "${data.pubDate}"
tags: ${formatTags(data.tags)}
---

${data.description}

<!-- Add your blog post content here -->

## Introduction

Write your introduction here...

## Main Content

Add your main content sections here...

## Conclusion

Wrap up your thoughts here...

---

*Published on ${new Date(data.pubDate).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		})}*
`,
	},

	note: {
		path: "src/content/note",
		schema: {
			required: ["title", "description", "pubDate"],
			optional: ["tags", "OGImage", "heroImage"],
		},
		template: (data) => `---
title: "${data.title}"
description: "${data.description}"
pubDate: "${data.pubDate}"
tags: ${formatTags(data.tags)}
---

# ${data.title}

${data.description}

<!-- Add your note content here -->

## Key Points

- Point 1
- Point 2
- Point 3

## Details

Add your detailed notes here...

---

*Note created on ${new Date(data.pubDate).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		})}*
`,
	},

	ephemera: {
		path: "src/content/ephemera",
		schema: {
			required: ["date"],
			optional: ["syndication", "youtube", "image"],
		},
		template: (data) => `---
date: "${data.date}"
${data.image ? `image:\n  src: "${data.image.src}"\n  alt: "${data.image.alt}"` : ""}
${data.youtube ? `youtube: "${data.youtube}"` : ""}
---

${data.content || "Add your ephemera content here..."}
`,
	},
};

/**
 * Prompts user for input
 */
function prompt(question, defaultValue = "") {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		const promptText = defaultValue
			? `${question} (${defaultValue}): `
			: `${question}: `;

		rl.question(promptText, (answer) => {
			rl.close();
			resolve(answer.trim() || defaultValue);
		});
	});
}

/**
 * Generates a slug from title
 */
function generateSlug(title) {
	return title
		.toLowerCase()
		.replace(/[^\w\s-]/g, "") // Remove special characters
		.replace(/\s+/g, "-") // Replace spaces with hyphens
		.replace(/-+/g, "-") // Replace multiple hyphens with single
		.trim();
}

/**
 * Formats tags array for YAML
 */
function formatTags(tags) {
	if (!tags || tags.length === 0) return "[]";
	return `["${tags.join('", "')}"]`;
}

/**
 * Gets content type from command line arguments
 */
function getContentType() {
	const args = process.argv.slice(2);

	// Check for --type=value format
	const typeEqualsArg = args.find((arg) => arg.startsWith("--type="));
	if (typeEqualsArg) {
		return typeEqualsArg.split("=")[1];
	}

	// Check for --type value format
	const typeIndex = args.indexOf("--type");
	if (typeIndex !== -1 && typeIndex + 1 < args.length) {
		return args[typeIndex + 1];
	}

	return null;
}

/**
 * Main function
 */
async function main() {
	console.log(
		`${colors.cyan}${colors.bright}🚀 Astro Content Generator${colors.reset}`,
	);
	console.log(
		`${colors.blue}Creating new content following Astro content collection conventions${colors.reset}\n`,
	);

	try {
		// Get content type
		let contentType = getContentType();

		if (!contentType) {
			console.log(`${colors.yellow}Available content types:${colors.reset}`);
			Object.keys(contentTypes).forEach((type) => {
				console.log(`  • ${type}`);
			});
			console.log();

			contentType = await prompt("Content type (blog/note/ephemera)", "blog");
		}

		if (!contentTypes[contentType]) {
			console.log(
				`${colors.red}❌ Invalid content type: ${contentType}${colors.reset}`,
			);
			console.log(
				`${colors.yellow}Available types: ${Object.keys(contentTypes).join(", ")}${colors.reset}`,
			);
			process.exit(1);
		}

		const config = contentTypes[contentType];
		console.log(
			`${colors.green}📝 Creating new ${contentType} content${colors.reset}\n`,
		);

		const now = new Date();
		// One source of truth: a local-time (Eastern) timestamp, reused for every
		// frontmatter date so all 3 content types share the same mechanism.
		const parts = Object.fromEntries(
			new Intl.DateTimeFormat("en-US", {
				timeZone: "America/New_York",
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hourCycle: "h23",
				timeZoneName: "longOffset",
			})
				.formatToParts(now)
				.filter((part) => part.type !== "literal")
				.map((part) => [part.type, part.value]),
		);
		// Full local timestamp, e.g. "2026-09-04T21:03:26-04:00"
		const date = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${parts.timeZoneName.replace("GMT", "")}`;
		// Date portion for blog/note filenames, e.g. "2026-09-04"
		const dateString = date.slice(0, 10);

		// Prompt for content details based on type
		const data = { pubDate: date, date };

		if (contentType === "ephemera") {
			data.content = await prompt(
				"Content",
				"Add your ephemera content here...",
			);

			// Ask about image
			const hasImage = await prompt("Include image? (y/n)", "n");

			if (hasImage === "y" || hasImage === "Y") {
				const imageName = await prompt("Image name");
				const altText = await prompt("Alt text");

				data.image = {
					src: imageName.startsWith("./") ? imageName : `./${imageName}`,
					alt: altText,
				};
			}

			const youtube = await prompt("YouTube video ID (optional)");
			if (youtube) {
				data.youtube = youtube;
			}
		} else {
			// Blog or Note
			const title = await prompt("Title");
			if (!title) {
				console.log(`${colors.red}❌ Title is required${colors.reset}`);
				process.exit(1);
			}

			const description = await prompt(
				"Description",
				`A ${contentType} about ${title.toLowerCase()}`,
			);
			const tagsInput = await prompt("Tags (comma-separated)", contentType);
			const tags = tagsInput
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean);

			data.title = title;
			data.description = description;
			data.tags = tags;
		}

		// Generate filename and path
		let filename, filepath;

		if (contentType === "ephemera") {
			// Year/month/day folder + per-second filename, from the same
			// timestamp source as the frontmatter (the "2-digit" options pad it).
			const dirPath = join(
				projectRoot,
				config.path,
				parts.year,
				parts.month,
				parts.day,
			);
			mkdirSync(dirPath, { recursive: true });

			filename = `${parts.year}-${parts.month}-${parts.day}-${parts.hour}-${parts.minute}-${parts.second}.md`;
			filepath = join(dirPath, filename);
		} else {
			// Generate path based on content type
			const basePath =
				contentType === "blog" ? config.getPath(data) : config.path;

			// Create year directory for blog posts
			if (contentType === "blog") {
				const yearPath = join(projectRoot, basePath);
				mkdirSync(yearPath, { recursive: true });
			}

			// Generate slug-based filename
			const slug = generateSlug(data.title);
			filename = `${dateString}-${slug}.md`;
			filepath = join(projectRoot, basePath, filename);
		}

		// Check if file already exists
		if (existsSync(filepath)) {
			console.log(
				`${colors.red}❌ File already exists: ${filepath}${colors.reset}`,
			);
			process.exit(1);
		}

		// Generate content
		const content = config.template(data);

		// Write the file
		writeFileSync(filepath, content, "utf-8");

		console.log(
			`${colors.green}✅ ${contentType} content created successfully!${colors.reset}`,
		);
		console.log(`${colors.blue}📁 File: ${filepath}${colors.reset}`);

		if (contentType !== "ephemera") {
			console.log(`${colors.blue}📝 Title: ${data.title}${colors.reset}`);
			console.log(
				`${colors.blue}🏷️  Tags: ${data.tags?.join(", ")}${colors.reset}`,
			);
			console.log(
				`${colors.blue}🔗 URL: /${contentType}/${dateString}-${generateSlug(data.title)}.html${colors.reset}`,
			);
		} else {
			console.log(`${colors.blue}📅 Date: ${data.date}${colors.reset}`);

			// Ask to open containing folder
			const openFolder = await prompt("Open containing folder? (y/n)", "n");
			if (openFolder.toLowerCase() === "y") {
				const dirPath = dirname(filepath);
				try {
					const { execSync } = await import("child_process");
					const command = process.platform === "darwin" ? "open" : "xdg-open";
					execSync(`${command} "${dirPath}"`, { stdio: "ignore" });
					console.log(`${colors.green}📂 Folder opened!${colors.reset}`);
				} catch {
					console.log(`${colors.yellow}💡 Folder: ${dirPath}${colors.reset}`);
				}
			}
		}

		console.log(`\n${colors.yellow}💡 Next steps:${colors.reset}`);
		console.log(`1. Edit the file to add your content`);
		if (contentType === "ephemera" && data.image) {
			console.log(`2. Image will be loaded from: ${data.image.src}`);
		}
		console.log(
			`${contentType === "ephemera" && data.image ? "3" : "2"}. Run 'npm run build' to test the build`,
		);
		console.log(
			`${contentType === "ephemera" && data.image ? "4" : "3"}. Commit and push your changes`,
		);
	} catch (error) {
		console.error(
			`${colors.red}❌ Error creating content:${colors.reset}`,
			error.message,
		);
		process.exit(1);
	}
}

// Run the script
main();
