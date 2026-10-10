// @vitest-environment node
//
// The global setup file (src/test/setup.ts) mocks fs and gray-matter for the
// component/integration suites; this suite exercises the real implementations.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.unmock("fs");
vi.unmock("path");
vi.unmock("gray-matter");

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import {
	getDateFromFile,
	getTitleFromContent,
	getDescription,
	getTags,
	isPublishable,
	filePathToUrl,
	generateMarkdownDigest,
	collectWeeklyContent,
	sendEmail,
	deleteEmail,
	createAndVerifyDraft,
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

const DAY = 24 * 60 * 60 * 1000;
const isoDaysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();

const writeFixture = (root, rel, frontmatter, body) => {
	const full = path.join(root, rel);
	fs.mkdirSync(path.dirname(full), { recursive: true });
	fs.writeFileSync(
		full,
		`---\n${frontmatter}\n---\n\n${body ?? "Body text that is long enough to serve as the description paragraph."}\n`,
	);
};

describe("collectWeeklyContent (fixture root)", () => {
	let root;
	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "digest-content-"));
	});
	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("collects recent publishable content and skips the rest", async () => {
		writeFixture(
			root,
			"blog/2026-10-08-recent.md",
			`title: Recent Blog\ndate: '${isoDaysAgo(2)}'`,
		);
		writeFixture(
			root,
			"blog/2026-10-08-secret.md",
			`title: Secret Post\ndate: '${isoDaysAgo(2)}'\npublished: false`,
		);
		writeFixture(
			root,
			"blog/2020-01-01-old.md",
			`title: Old Post\ndate: '2020-01-01T00:00:00Z'`,
		);
		writeFixture(
			root,
			"note/recent-note.md",
			`title: Recent Note\npubDate: '${isoDaysAgo(1)}'`,
		);
		writeFixture(
			root,
			"note/violin/nested-note.md",
			`title: Nested Note\npubDate: '${isoDaysAgo(1)}'`,
		);
		writeFixture(
			root,
			"ephemera/2026/10/07/2026-10-07-08-53-54.md",
			`date: '${isoDaysAgo(2)}'\nsyndication:\n  - href: 'https://mastodon.social/@x/1'\n    title: Mastodon\n  - href: 'https://bsky.app/profile/x/post/1'\n    title: Bluesky`,
		);

		const content = await collectWeeklyContent(root);

		// blog: secret (published:false) and old (outside window) excluded
		expect(content.blog.map((p) => p.title)).toEqual(["Recent Blog"]);
		// note: nested-subdirectory note excluded (collections like violin/)
		expect(content.note.map((p) => p.title)).toEqual(["Recent Note"]);
		// ephemera: regression — nested syndication must not flatten into a title
		expect(content.ephemera.map((p) => p.title)).toEqual([
			"2026-10-07-08-53-54",
		]);
		expect(content.ephemera[0].url).toBe(
			"https://ryanparsley.com/ephemera/2026/10/07/2026-10-07-08-53-54",
		);
	});

	it("returns empty collections when nothing is in the window", async () => {
		writeFixture(
			root,
			"blog/2020-01-01-old.md",
			`title: Old\ndate: '2020-01-01T00:00:00Z'`,
		);
		const content = await collectWeeklyContent(root);
		expect(content).toEqual({ blog: [], note: [], ephemera: [] });
	});

	it("handles missing collection directories", async () => {
		const content = await collectWeeklyContent(root);
		expect(content).toEqual({ blog: [], note: [], ephemera: [] });
	});
});

describe("sendEmail", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("posts the digest to Buttondown with the expected shape", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({ id: "email-1", absolute_url: "https://btn.down/x" }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const result = await sendEmail("Subject", "Body markdown", {
			apiKey: "test-key",
		});

		expect(result.id).toBe("email-1");
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("https://api.buttondown.com/v1/emails");
		expect(init.headers.Authorization).toBe("Token test-key");
		expect(JSON.parse(init.body)).toMatchObject({
			subject: "Subject",
			body: "Body markdown",
			email_type: "public",
			status: "about_to_send",
		});
	});

	it("pins the API version (the contract must not float)", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: "email-1" }),
		});
		vi.stubGlobal("fetch", fetchMock);

		await sendEmail("S", "B", { apiKey: "k" });

		expect(fetchMock.mock.calls[0][1].headers["X-API-Version"]).toBe(
			"2026-04-01",
		);
	});

	it("defaults to about_to_send (the real send path must not drift to draft)", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: "email-1" }),
		});
		vi.stubGlobal("fetch", fetchMock);

		await sendEmail("S", "B", { apiKey: "k" });

		expect(JSON.parse(fetchMock.mock.calls[0][1].body).status).toBe(
			"about_to_send",
		);
	});

	it("can create a draft instead of sending", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: "draft-1" }),
		});
		vi.stubGlobal("fetch", fetchMock);

		await sendEmail("S", "B", { apiKey: "k", status: "draft" });

		expect(JSON.parse(fetchMock.mock.calls[0][1].body).status).toBe("draft");
	});

	it("throws with status and body on API error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 422,
				text: () => Promise.resolve("Invalid"),
			}),
		);
		await expect(sendEmail("S", "B", { apiKey: "k" })).rejects.toThrow(
			"Buttondown API error: 422 - Invalid",
		);
	});
});

describe("main (subprocess e2e)", () => {
	const scriptPath = path.join(scriptDir, "send-digest.js");
	const repoRoot = path.join(scriptDir, "..");
	let root;
	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "digest-e2e-"));
	});
	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	const run = (args, env = {}) => {
		try {
			const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
				cwd: repoRoot,
				env: { ...process.env, BUTTONDOWN_API_KEY: "", ...env },
				encoding: "utf-8",
				stdio: ["ignore", "pipe", "pipe"],
			});
			return { code: 0, stdout, stderr: "" };
		} catch (error) {
			return {
				code: error.status,
				stdout: error.stdout ?? "",
				stderr: error.stderr ?? "",
			};
		}
	};

	it("--dry-run prints the digest and sends nothing", () => {
		writeFixture(
			root,
			"blog/2026-10-08-recent.md",
			`title: Recent Blog\ndate: '${isoDaysAgo(2)}'`,
		);
		const result = run(["--dry-run"], { DIGEST_CONTENT_ROOT: root });
		expect(result.code).toBe(0);
		expect(result.stdout).toContain("=== SUBJECT ===");
		expect(result.stdout).toContain("[Recent Blog]");
		expect(result.stdout).toContain("Dry run");
	});

	it("exits 1 without a key when there is content to send", () => {
		writeFixture(
			root,
			"blog/2026-10-08-recent.md",
			`title: Recent Blog\ndate: '${isoDaysAgo(2)}'`,
		);
		const result = run([], { DIGEST_CONTENT_ROOT: root });
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("BUTTONDOWN_API_KEY");
	});

	it("skips quietly when nothing is in the window", () => {
		const result = run([], { DIGEST_CONTENT_ROOT: root });
		expect(result.code).toBe(0);
		expect(result.stdout).toContain("No new content this week");
	});

	it("--draft requires a key (and never touches the network without one)", () => {
		writeFixture(
			root,
			"blog/2026-10-08-recent.md",
			`title: Recent Blog\ndate: '${isoDaysAgo(2)}'`,
		);
		const result = run(["--draft"], { DIGEST_CONTENT_ROOT: root });
		expect(result.code).toBe(1);
		expect(result.stderr).toContain("BUTTONDOWN_API_KEY");
	});
});

describe("deleteEmail", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("DELETEs the email by id", async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal("fetch", fetchMock);

		await deleteEmail("em_123", "test-key");

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("https://api.buttondown.com/v1/emails/em_123");
		expect(init.method).toBe("DELETE");
		expect(init.headers.Authorization).toBe("Token test-key");
		expect(init.headers["X-API-Version"]).toBe("2026-04-01");
	});

	it("throws on API error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				text: () => Promise.resolve("Not found"),
			}),
		);
		await expect(deleteEmail("em_nope", "k")).rejects.toThrow(
			"Buttondown API error: 404 - Not found",
		);
	});
});

describe("createAndVerifyDraft", () => {
	afterEach(() => vi.unstubAllGlobals());

	it("creates a draft then deletes it (no delivery, no residue)", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ id: "draft-1" }),
			})
			.mockResolvedValueOnce({ ok: true });
		vi.stubGlobal("fetch", fetchMock);

		const draft = await createAndVerifyDraft("S", "B", "k");

		expect(draft.id).toBe("draft-1");
		expect(JSON.parse(fetchMock.mock.calls[0][1].body).status).toBe("draft");
		expect(fetchMock.mock.calls[1][0]).toContain("draft-1");
		expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
	});

	it("does not attempt deletion when draft creation fails", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			text: () => Promise.resolve("boom"),
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(createAndVerifyDraft("S", "B", "k")).rejects.toThrow(
			"Buttondown API error: 500",
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
