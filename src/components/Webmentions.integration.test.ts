import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { http, passthrough } from "msw";
import { server } from "../test/setup";
import {
	fetchWebmentionsForUrl,
	fetchAllVariants,
	type WebmentionEntry,
} from "../utils/webmentions";

const API_TOKEN = process.env.WEBMENTION_IO_TOKEN ?? "";

describe.skipIf(!API_TOKEN)("webmention.io integration - real API", () => {
	beforeAll(() => {
		server.use(http.all("https://webmention.io/*", () => passthrough()));
	});

	afterAll(() => {
		server.resetHandlers();
	});

	it("fetches webmentions and returns valid entry shape", async () => {
		const result = await fetchWebmentionsForUrl("https://ryanparsley.com/", {
			apiToken: API_TOKEN,
			maxRetries: 2,
			timeoutMs: 10_000,
		});

		expect(Array.isArray(result)).toBe(true);

		if (result.length > 0) {
			const entry: WebmentionEntry = result[0]!;
			expect(entry).toHaveProperty("wm-property");
			expect(entry).toHaveProperty("wm-source");
			expect(entry).toHaveProperty("wm-target");
			expect(entry).toHaveProperty("wm-protocol", "webmention");
			expect(entry).toHaveProperty("author");
			expect(entry.author).toHaveProperty("name");
		}
	});

	it("fetchAllVariants returns deduplicated results", async () => {
		const result = await fetchAllVariants(
			"https://ryanparsley.com/",
			API_TOKEN,
		);

		expect(Array.isArray(result)).toBe(true);

		const urls = result.map((e) => e.url);
		expect(new Set(urls).size).toBe(urls.length);
	});
});
