import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	getUrlVariants,
	isProperty,
	fetchWebmentionsForUrl,
	fetchAllVariants,
	deduplicateMentions,
	computeCounts,
	parseTokenFromEnvFile,
	type WebmentionEntry,
} from "../utils/webmentions";

const makeEntry = (
	overrides: Partial<WebmentionEntry> = {},
): WebmentionEntry => ({
	type: "entry",
	author: { type: "card", name: "Tester", url: "https://example.com" },
	url: "https://example.com/comment",
	published: "2025-01-01T10:00:00Z",
	"wm-received": "2025-01-01T10:05:00Z",
	"wm-id": 1,
	"wm-source": "https://example.com/comment",
	"wm-target": "https://target.com/post",
	"wm-protocol": "webmention",
	content: { html: "<p>hi</p>", text: "hi" },
	"in-reply-to": "https://target.com/post",
	"wm-property": "mention-of",
	"wm-private": false,
	...overrides,
});

describe("getUrlVariants", () => {
	it("generates variants for plain URL", () => {
		const url = "https://example.com/blog/my-post";
		const variants = getUrlVariants(url);

		expect(variants).toContain(url);
		expect(variants).toContain(url + "/");
		expect(variants).toContain(url + ".html");
		expect(variants).toHaveLength(3);
	});

	it("generates variants for URL with trailing slash", () => {
		const url = "https://example.com/blog/my-post/";
		const variants = getUrlVariants(url);

		expect(variants).toContain(url);
		expect(variants).toContain("https://example.com/blog/my-post");
		expect(variants).toContain("https://example.com/blog/my-post.html");
		expect(variants).toHaveLength(3);
	});

	it("generates variants for URL with .html extension", () => {
		const url = "https://example.com/blog/my-post.html";
		const variants = getUrlVariants(url);

		expect(variants).toContain(url);
		expect(variants).toContain(url + "/");
		expect(variants).toHaveLength(2);
	});

	it("does not return duplicates", () => {
		const url = "https://example.com/blog/my-post.html";
		const variants = getUrlVariants(url);

		expect(new Set(variants).size).toBe(variants.length);
	});
});

describe("isProperty", () => {
	it("returns true for matching property", () => {
		const entry = makeEntry({ "wm-property": "like-of" });
		expect(isProperty(entry, "like-of")).toBe(true);
	});

	it("returns false for non-matching property", () => {
		const entry = makeEntry({ "wm-property": "like-of" });
		expect(isProperty(entry, "repost-of")).toBe(false);
	});
});

describe("computeCounts", () => {
	it("counts likes, reposts, mentions, and replies", () => {
		const children = [
			makeEntry({ "wm-property": "like-of" }),
			makeEntry({ "wm-property": "repost-of" }),
			makeEntry({ "wm-property": "like-of" }),
			makeEntry({ "wm-property": "mention-of" }),
			makeEntry({ "wm-property": "in-reply-to" }),
			makeEntry({ "wm-property": "in-reply-to" }),
			makeEntry({ "wm-property": "in-reply-to" }),
		];

		const counts = computeCounts(children);

		expect(counts.likesAndRepostsCount).toBe(3);
		expect(counts.mentionsCount).toBe(1);
		expect(counts.repliesCount).toBe(3);
	});

	it("returns zero for empty array", () => {
		const counts = computeCounts([]);
		expect(counts).toEqual({
			likesAndRepostsCount: 0,
			mentionsCount: 0,
			repliesCount: 0,
		});
	});
});

describe("deduplicateMentions", () => {
	it("removes duplicates by url", () => {
		const mentions = [
			makeEntry({ url: "https://example.com/1", "wm-property": "like-of" }),
			makeEntry({ url: "https://example.com/2", "wm-property": "repost-of" }),
			makeEntry({ url: "https://example.com/1", "wm-property": "like-of" }),
		];

		const result = deduplicateMentions(mentions);

		expect(result).toHaveLength(2);
		expect(result.map((m) => m.url)).toEqual([
			"https://example.com/1",
			"https://example.com/2",
		]);
	});

	it("filters out null and undefined entries", () => {
		const mentions = [
			makeEntry({ url: "https://example.com/1", "wm-id": 1 }),
			null as unknown as WebmentionEntry,
			undefined as unknown as WebmentionEntry,
			makeEntry({ url: "https://example.com/2", "wm-id": 2 }),
		];

		const result = deduplicateMentions(mentions);

		expect(result).toHaveLength(2);
	});

	it("returns empty array when given empty array", () => {
		expect(deduplicateMentions([])).toEqual([]);
	});
});

describe("fetchWebmentionsForUrl", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		if ("fetch" in globalThis) {
			delete (globalThis as Record<string, unknown>).fetch;
		}
	});

	it("returns empty array when no token provided", async () => {
		const result = await fetchWebmentionsForUrl("https://example.com/post", {
			apiToken: "",
		});

		expect(result).toEqual([]);
	});

	it("fetches from webmention.io and returns children", async () => {
		const mockChildren = [
			makeEntry({ url: "https://other.com/comment", "wm-property": "like-of" }),
		];

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ children: mockChildren }),
		});

		const result = await fetchWebmentionsForUrl("https://example.com/post", {
			apiToken: "test-token",
		});

		expect(result).toEqual(mockChildren);
		expect(globalThis.fetch).toHaveBeenCalledWith(
			expect.stringContaining("webmention.io/api/mentions.jf2"),
			expect.objectContaining({
				headers: { "User-Agent": "Astro-Build/1.0" },
			}),
		);
	});

	it("retries on failure with exponential backoff", async () => {
		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const promise = fetchWebmentionsForUrl("https://example.com/post", {
			apiToken: "test-token",
			maxRetries: 3,
		});

		// After attempt 1: backoff 1s (2^0 * 1000)
		await vi.advanceTimersByTimeAsync(1000);
		// After attempt 2: backoff 2s (2^1 * 1000)
		await vi.advanceTimersByTimeAsync(2000);
		// After attempt 3: no retry, returns empty
		await vi.advanceTimersByTimeAsync(0);

		const result = await promise;

		expect(result).toEqual([]);
		expect(globalThis.fetch).toHaveBeenCalledTimes(3);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});

	it("returns empty on HTTP error", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});

		// resolve all retries and backoffs
		const promise = fetchWebmentionsForUrl("https://example.com/post", {
			apiToken: "test-token",
			maxRetries: 1,
		});

		await vi.advanceTimersByTimeAsync(0);

		const result = await promise;

		expect(result).toEqual([]);
	});

	it("encodes the target URL in the API request", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ children: [] }),
		});

		await fetchWebmentionsForUrl("https://example.com/post with spaces", {
			apiToken: "tok",
			maxRetries: 1,
		});

		const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
		const calledUrl = mockFetch.mock.calls[0]![0] as string;
		expect(calledUrl).toContain(
			encodeURIComponent("https://example.com/post with spaces"),
		);
		expect(calledUrl).not.toContain("post with spaces");
	});
});

describe("fetchAllVariants", () => {
	it("fetches all URL variants and deduplicates", async () => {
		const like = makeEntry({
			url: "https://other.com/like",
			"wm-property": "like-of",
		});

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ children: [like] }),
		});

		const result = await fetchAllVariants(
			"https://example.com/post",
			"test-token",
		);

		expect(result).toHaveLength(1);
		expect(result[0]!["wm-property"]).toBe("like-of");
	});

	it("returns empty array on all failures", async () => {
		vi.useFakeTimers();
		globalThis.fetch = vi.fn().mockRejectedValue(new Error("fail"));
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const promise = fetchAllVariants("https://example.com/post", "tok");
		await vi.advanceTimersByTimeAsync(100_000);
		const result = await promise;

		expect(result).toEqual([]);
	});

	it("returns entries only from successful variants", async () => {
		const likeEntry = makeEntry({
			url: "https://other.com/like",
			"wm-property": "like-of",
		});

		let callCount = 0;
		globalThis.fetch = vi.fn().mockImplementation(async () => {
			callCount++;
			if (callCount === 1) {
				return {
					ok: true,
					json: () => Promise.resolve({ children: [likeEntry] }),
				};
			}
			return {
				ok: true,
				json: () => Promise.resolve({ children: [] }),
			};
		});

		const result = await fetchAllVariants(
			"https://example.com/post",
			"test-token",
		);

		expect(result).toHaveLength(1);
		expect(result[0]!["wm-property"]).toBe("like-of");
	});
});

describe("fetchWebmentionsForUrl - malformed responses", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		if ("fetch" in globalThis) {
			delete (globalThis as Record<string, unknown>).fetch;
		}
	});

	it("returns empty array when children is null", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ children: null }),
		});

		const result = await fetchWebmentionsForUrl("https://example.com/post", {
			apiToken: "test-token",
		});

		expect(result).toEqual([]);
	});

	it("returns empty array when children key is missing", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({}),
		});

		const result = await fetchWebmentionsForUrl("https://example.com/post", {
			apiToken: "test-token",
		});

		expect(result).toEqual([]);
	});

	it("returns empty array when response body is not valid JSON", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.reject(new Error("Unexpected token")),
		});

		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = await fetchWebmentionsForUrl("https://example.com/post", {
			apiToken: "test-token",
			maxRetries: 1,
		});

		expect(result).toEqual([]);
		warnSpy.mockRestore();
	});

	it("handles entries with missing optional fields", async () => {
		const sparseEntry = {
			type: "entry" as const,
			url: "https://example.com/comment",
			"wm-property": "mention-of",
			"wm-source": "https://source.com",
			"wm-target": "https://target.com",
			"wm-id": 1,
			"wm-received": "2025-01-01T00:00:00Z",
			"wm-protocol": "webmention",
			"wm-private": false,
			published: "2025-01-01T00:00:00Z",
		} as unknown as WebmentionEntry;

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ children: [sparseEntry] }),
		});

		const result = await fetchWebmentionsForUrl("https://example.com/post", {
			apiToken: "test-token",
		});

		expect(result).toHaveLength(1);
		expect(result[0]!["wm-property"]).toBe("mention-of");
	});
});

describe("fetchWebmentionsForUrl - timeout", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		if ("fetch" in globalThis) {
			delete (globalThis as Record<string, unknown>).fetch;
		}
	});

	it("aborts fetch after timeout and returns empty", async () => {
		globalThis.fetch = vi.fn().mockImplementation((_url, opts) => {
			return new Promise((_, reject) => {
				opts?.signal?.addEventListener("abort", () => {
					reject(new DOMException("The operation was aborted.", "AbortError"));
				});
			});
		});
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const promise = fetchWebmentionsForUrl("https://example.com/post", {
			apiToken: "test-token",
			maxRetries: 1,
			timeoutMs: 100,
		});

		await vi.advanceTimersByTimeAsync(100);
		const result = await promise;

		expect(result).toEqual([]);
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
		warnSpy.mockRestore();
	});
});

describe("parseTokenFromEnvFile", () => {
	it("parses unquoted token", () => {
		expect(parseTokenFromEnvFile("export WEBMENTION_IO_TOKEN=abc123")).toBe(
			"abc123",
		);
	});

	it("parses single-quoted token", () => {
		expect(parseTokenFromEnvFile("export WEBMENTION_IO_TOKEN='abc123'")).toBe(
			"abc123",
		);
	});

	it("parses double-quoted token", () => {
		expect(parseTokenFromEnvFile('export WEBMENTION_IO_TOKEN="abc123"')).toBe(
			"abc123",
		);
	});

	it("parses token from multiline file", () => {
		const content = [
			"OTHER_VAR=foo",
			"export WEBMENTION_IO_TOKEN=secret123",
			"ANOTHER_VAR=bar",
		].join("\n");

		expect(parseTokenFromEnvFile(content)).toBe("secret123");
	});

	it("returns null when no token found", () => {
		expect(parseTokenFromEnvFile("OTHER_VAR=foo\nANOTHER_VAR=bar")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(parseTokenFromEnvFile("")).toBeNull();
	});

	it("ignores lines without export prefix", () => {
		expect(
			parseTokenFromEnvFile("WEBMENTION_IO_TOKEN=should-not-match"),
		).toBeNull();
	});
});
