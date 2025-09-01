#!/usr/bin/env node

/**
 * Blog Post Generator for Astro
 *
 * Generates a new blog post with proper frontmatter following Astro content collection schema.
 * Usage: node scripts/new-blog-post.js
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createInterface } from "readline";

/* eslint-env node */
/* global console, process */

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
 * Generates the frontmatter for a blog post
 */
function generateFrontmatter(data) {
	return `---
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
`;
}

/**
 * Main function
 */
async function main() {
	console.log(
		`${colors.cyan}${colors.bright}🚀 Astro Blog Post Generator${colors.reset}`,
	);
	console.log(
		`${colors.blue}Creating a new blog post following Astro content collection conventions${colors.reset}\n`,
	);

	try {
		// Get current date
		const now = new Date();
		const dateString = now.toISOString().split("T")[0]; // YYYY-MM-DD format

		// Prompt for blog post details
		const title = await prompt("Blog post title");
		if (!title) {
			console.log(`${colors.red}❌ Title is required${colors.reset}`);
			process.exit(1);
		}

		const description = await prompt(
			"Blog post description",
			`A blog post about ${title.toLowerCase()}`,
		);
		const tagsInput = await prompt("Tags (comma-separated)", "blog");
		const tags = tagsInput
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);

		// Generate slug and filename
		const slug = generateSlug(title);
		const filename = `${dateString}-${slug}.md`;

		// Create year directory
		const year = now.getFullYear();
		const yearPath = join(projectRoot, "src", "content", "blog", String(year));
		mkdirSync(yearPath, { recursive: true });

		const filepath = join(yearPath, filename);

		// Check if file already exists
		if (existsSync(filepath)) {
			console.log(
				`${colors.red}❌ File already exists: ${filename}${colors.reset}`,
			);
			process.exit(1);
		}

		// Generate frontmatter and content
		const blogData = {
			title,
			description,
			pubDate: dateString,
			tags,
		};

		const content = generateFrontmatter(blogData);

		// Write the file
		writeFileSync(filepath, content, "utf-8");

		console.log(
			`${colors.green}✅ Blog post created successfully!${colors.reset}`,
		);
		console.log(`${colors.blue}📁 File: ${filepath}${colors.reset}`);
		console.log(`${colors.blue}📝 Title: ${title}${colors.reset}`);
		console.log(`${colors.blue}🏷️  Tags: ${tags.join(", ")}${colors.reset}`);
		console.log(
			`${colors.blue}🔗 URL: /blog/${dateString}-${slug}.html${colors.reset}`,
		);
		console.log(`\n${colors.yellow}💡 Next steps:${colors.reset}`);
		console.log(`1. Edit the file to add your blog post content`);
		console.log(`2. Add any images to the appropriate directory`);
		console.log(`3. Run 'npm run build' to test the build`);
		console.log(`4. Commit and push your changes`);
	} catch (error) {
		console.error(
			`${colors.red}❌ Error creating blog post:${colors.reset}`,
			error.message,
		);
		process.exit(1);
	}
}

// Run the script
main();
