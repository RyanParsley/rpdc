#!/usr/bin/env node

/**
 * Draft Promoter
 *
 * Promotes a draft to a published blog post:
 *   - sets pubDate/updatedDate to now (America/New_York)
 *   - moves the file from src/content/draft to src/content/blog/<year>/
 *   - re-prefixes the filename with the publish date
 *
 * Usage:
 *   npm run promote-draft
 *   npm run promote-draft -- src/content/draft/my-draft.md
 */

import {
	readFileSync,
	writeFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	unlinkSync,
} from "fs";
import { join, dirname, basename, resolve } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const DRAFT_DIR = join(projectRoot, "src/content/draft");
const BLOG_DIR = join(projectRoot, "src/content/blog");

// ANSI color codes for better console output
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
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

	return new Promise((resolvePromise) => {
		const promptText = defaultValue
			? `${question} (${defaultValue}): `
			: `${question}: `;

		rl.question(promptText, (answer) => {
			rl.close();
			resolvePromise(answer.trim() || defaultValue);
		});
	});
}

/**
 * Current local (Eastern) timestamp, matching new-content.js so all
 * frontmatter dates share one mechanism.
 */
function getTimestamp() {
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
			.formatToParts(new Date())
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, part.value]),
	);

	return {
		// Full local timestamp, e.g. "2026-09-04T21:03:26-04:00"
		date: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${parts.timeZoneName.replace("GMT", "")}`,
		dateString: `${parts.year}-${parts.month}-${parts.day}`,
		year: parts.year,
	};
}

/**
 * Resolves the draft to promote: CLI arg or interactive picker.
 */
async function pickDraft() {
	const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
	if (arg) {
		const fullPath = resolve(arg);
		if (!existsSync(fullPath)) {
			console.log(`${colors.red}❌ File not found: ${arg}${colors.reset}`);
			process.exit(1);
		}
		return fullPath;
	}

	const drafts = readdirSync(DRAFT_DIR).filter((f) => f.endsWith(".md"));
	if (drafts.length === 0) {
		console.log(
			`${colors.yellow}No drafts found in src/content/draft/${colors.reset}`,
		);
		process.exit(0);
	}

	console.log(`${colors.yellow}Available drafts:${colors.reset}`);
	drafts.forEach((file, index) => {
		console.log(`  ${index + 1}. ${file}`);
	});
	console.log();

	const answer = await prompt("Promote which draft? (number)", "1");
	const index = Number.parseInt(answer, 10) - 1;

	if (Number.isNaN(index) || index < 0 || index >= drafts.length) {
		console.log(`${colors.red}❌ Invalid selection: ${answer}${colors.reset}`);
		process.exit(1);
	}

	return join(DRAFT_DIR, drafts[index]);
}

/**
 * Main function
 */
async function main() {
	console.log(
		`${colors.cyan}${colors.bright}📣 Draft Promoter${colors.reset}\n`,
	);

	try {
		const draftPath = await pickDraft();
		const parsed = matter(readFileSync(draftPath, "utf-8"));

		if (!parsed.data.title) {
			console.log(
				`${colors.red}❌ Draft has no title in frontmatter: ${draftPath}${colors.reset}`,
			);
			process.exit(1);
		}

		const { date, dateString, year } = getTimestamp();

		// Strip any existing date prefix, then re-prefix with the publish date
		const slug = basename(draftPath, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
		const targetDir = join(BLOG_DIR, year);
		const targetPath = join(targetDir, `${dateString}-${slug}.md`);

		if (existsSync(targetPath)) {
			console.log(
				`${colors.red}❌ Target already exists: ${targetPath}${colors.reset}`,
			);
			process.exit(1);
		}

		const promoted = matter.stringify(parsed.content, {
			...parsed.data,
			pubDate: date,
			updatedDate: date,
		});

		mkdirSync(targetDir, { recursive: true });
		writeFileSync(targetPath, promoted, "utf-8");
		unlinkSync(draftPath);

		console.log(
			`${colors.green}✅ Draft promoted to blog post!${colors.reset}`,
		);
		console.log(`${colors.blue}📝 Title: ${parsed.data.title}${colors.reset}`);
		console.log(`${colors.blue}📁 File: ${targetPath}${colors.reset}`);
		console.log(
			`${colors.blue}🔗 URL: /blog/${year}/${dateString}-${slug}/${colors.reset}`,
		);
		console.log(`\n${colors.yellow}💡 Next steps:${colors.reset}`);
		console.log(`1. Review the frontmatter (pubDate set to now)`);
		console.log(`2. Run 'npm run build' to test the build`);
		console.log(`3. Commit and push your changes`);
	} catch (error) {
		console.error(
			`${colors.red}❌ Error promoting draft:${colors.reset}`,
			error.message,
		);
		process.exit(1);
	}
}

// Run the script
main();
