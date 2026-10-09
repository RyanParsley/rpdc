// @vitest-environment node
//
// The global setup file (src/test/setup.ts) mocks fs and gray-matter for the
// component/integration suites; this suite exercises the real implementations.
import { describe, it, expect, vi } from "vitest";

vi.unmock("fs");
vi.unmock("path");
vi.unmock("gray-matter");

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import {
	getDateFromFile,
	getTitleFromContent,
	getDescription,
	getTags,
	isPublishable,
	filePathToUrl,
	generateMarkdownDigest,
} from "./send-digest.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.join(scriptDir, "../src/content");

describe("isPublishable", () => {
	it("includes posts by default and respects the published opt-out", () => {
		expect(isPublishable({})).toBe(true);
		expect(isPublishable({ published: true })).toBe(true);
		expect(isPublishable({ published: false })).toBe(false);
	});
});

describe("getDateFromFile", () => {
	it("prefers pubDate over date and filename", () => {
		const result = getDateFromFile("2020-01-01-name.md", {
			pubDate: new Date("2026-03-15T12:00:00Z"),
			date: new Date("2026-01-01T00:00:00Z"),
		});
		expect(result.toISOString()).toBe("2026-03-15T12:00:00.000Z");
	});

	it("parses quoted ISO timestamps with timezones (regression: no off-by-one)", () => {
		// gray-matter hands us the string unquoted; the old hand-rolled parser
		// kept the quotes, produced an Invalid Date, and fell back to the
		// filename — which parses as UTC midnight and displays a day early in
		// negative-offset timezones.
		const result = getDateFromFile("2026-10-07-slug.md", {
			date: "2026-10-07T08:53:54-04:00",
		});
		expect(result.toISOString()).toBe("2026-10-07T12:53:54.000Z");
	});

	it("falls back to the filename's YYYY-MM-DD prefix", () => {
		const result = getDateFromFile("2026-02-28-hello-faircamp.md", {});
		expect(result.toISOString()).toBe("2026-02-28T00:00:00.000Z");
	});

	it("falls back to file mtime when nothing else parses", () => {
		const tmp = path.join(
			fs.mkdtempSync(path.join(os.tmpdir(), "digest-")),
			"no-date-here.md",
		);
		fs.writeFileSync(tmp, "content");
		const result = getDateFromFile(tmp, {});
		expect(result.getTime()).toBeCloseTo(fs.statSync(tmp).mtime.getTime(), -3);
		fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
	});
});

describe("getTitleFromContent", () => {
	it("uses the frontmatter title when present", () => {
		const content = `---\ntitle: 'Hello: Quoted'\n---\n\n# Ignored Heading\n`;
		expect(getTitleFromContent(content, "x.md")).toBe("Hello: Quoted");
	});

	it("falls back to the first h1 in the body", () => {
		const content = `---\ndate: 2026-01-01\n---\n\n# Body Heading\n\ntext`;
		expect(getTitleFromContent(content, "x.md")).toBe("Body Heading");
	});

	it("falls back to the filename", () => {
		expect(getTitleFromContent("no frontmatter here", "my-post.md")).toBe(
			"my-post",
		);
	});

	it("does not flatten nested frontmatter arrays into a bogus title (regression)", () => {
		// The old naive parser promoted `title:` entries nested inside the
		// syndication list, so this post's digest title became "Bluesky".
		const content = `---\ndate: '2026-10-07T08:53:54-04:00'\nsyndication:\n  - href: 'https://mastodon.social/@x/1'\n    title: Mastodon\n  - href: 'https://bsky.app/profile/x/post/1'\n    title: Bluesky\n---\n\nBody text.\n`;
		expect(getTitleFromContent(content, "2026-10-07-08-53-54.md")).toBe(
			"2026-10-07-08-53-54",
		);
	});
});

describe("getDescription", () => {
	it("prefers the frontmatter description", () => {
		const content = `---\ndescription: The summary.\n---\n\nBody paragraph that is long enough.\n`;
		expect(getDescription(content)).toBe("The summary.");
	});

	it("extracts the first substantial paragraph with markdown stripped", () => {
		const content = `---\ntitle: x\n---\n\n# A heading\n\nshort\n\nA paragraph with [a link](https://example.com) and **bold** text.\n`;
		expect(getDescription(content)).toBe(
			"A paragraph with a link and bold text.",
		);
	});

	it("returns empty string when nothing qualifies", () => {
		expect(getDescription("---\ntitle: x\n---\n\n# only a heading\n")).toBe("");
	});
});

describe("getTags", () => {
	it("parses flow-style arrays", () => {
		expect(getTags({ tags: ["posse", "indieweb"] })).toEqual([
			"posse",
			"indieweb",
		]);
	});

	it('parses block-style arrays (regression: naive parser yielded [""])', () => {
		// gray-matter has already YAML-parsed these into a real array.
		expect(getTags({ tags: ["alpha", "beta"] })).toEqual(["alpha", "beta"]);
	});

	it("splits string tags", () => {
		expect(getTags({ tags: "posse, #indieweb" })).toEqual([
			"posse",
			"indieweb",
		]);
	});

	it("returns empty for missing tags", () => {
		expect(getTags({})).toEqual([]);
	});
});

describe("filePathToUrl", () => {
	it("maps content paths to site URLs, stripping the extension", () => {
		expect(
			filePathToUrl(path.join(contentRoot, "blog/2026/2026-02-28-hello.md")),
		).toBe("https://ryanparsley.com/blog/2026/2026-02-28-hello");
		expect(filePathToUrl(path.join(contentRoot, "note/stow.mdx"))).toBe(
			"https://ryanparsley.com/note/stow",
		);
	});
});

describe("generateMarkdownDigest", () => {
	const item = (type) => ({
		title: `${type} title`,
		url: `https://ryanparsley.com/${type}/x`,
		date: new Date("2026-10-07T12:00:00Z"),
		description: `A ${type} description.`,
		tags: type === "ephemera" ? [] : ["posse"],
		type,
	});

	it("renders a section per populated collection", () => {
		const markdown = generateMarkdownDigest({
			blog: [item("blog")],
			note: [item("note")],
			ephemera: [item("ephemera")],
		});

		expect(markdown).toContain("## 📌 Blog");
		expect(markdown).toContain("## 📌 Note");
		expect(markdown).toContain("## 📌 Ephemera");
		expect(markdown).toContain("[blog title](https://ryanparsley.com/blog/x)");
		expect(markdown).toContain("Tags: #posse");
		expect(markdown).toContain("This weekly digest is automatically generated");
	});

	it("omits tags for items that have none", () => {
		const markdown = generateMarkdownDigest({
			blog: [],
			note: [],
			ephemera: [item("ephemera")],
		});

		expect(markdown).toContain("## 📌 Ephemera");
		expect(markdown).not.toContain("Tags:");
	});

	it("renders no sections when all collections are empty", () => {
		const markdown = generateMarkdownDigest({
			blog: [],
			note: [],
			ephemera: [],
		});

		expect(markdown).not.toContain("## 📌");
		expect(markdown).toContain("This weekly digest is automatically generated");
	});
});
