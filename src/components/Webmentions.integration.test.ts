import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { http, passthrough } from "msw";
import { server } from "../test/setup";
import {
	fetchWebmentionsForUrl,
	fetchAllVariants,
	type WebmentionEntry,
} from "../utils/webmentions";

const API_TOKEN = process.env.WEBMENTION_IO_TOKEN ?? "";

// Live traffic is opt-in on its own flag: a shell that happens to export
// WEBMENTION_IO_TOKEN (this repo's dev flow sources ~/.env, which defines it)
// must not silently turn network-bound tests on for everyone else's `npm run
// test`. Run them explicitly:
//   RUN_LIVE_WEBMENTION_TESTS=1 npm run test:run
const RUN_LIVE = !!process.env.RUN_LIVE_WEBMENTION_TESTS;

describe("webmention.io integration - intercepted", () => {
	it("fetches a single variant and maps the JF2 children", async () => {
		const result = await fetchWebmentionsForUrl("https://ryanparsley.com/", {
			apiToken: "intercepted-test-token",
		});

		expect(result.map((entry) => entry.url)).toEqual([
			"https://ref.example/one",
			"https://ref.example/two",
		]);

		const entry: WebmentionEntry = result[0]!;
		expect(entry["wm-protocol"]).toBe("webmention");
		expect(entry.author.name).toContain("Referencing Site");
	});

	it("probes every URL variant and collapses the overlap", async () => {
		const result = await fetchAllVariants(
			"https://ryanparsley.com/",
			"intercepted-test-token",
		);

		// The three variants serve five mentions between them, of which three
		// are unique — so a pass that only dedupes correctly lands here.
		expect(result.map((entry) => entry.url)).toEqual([
			"https://ref.example/one",
			"https://ref.example/two",
			"https://ref.example/three",
		]);
	});
});

describe.skipIf(!RUN_LIVE || !API_TOKEN)(
	"webmention.io integration - real API",
	() => {
		// The global setup resets runtime handlers after every test, so the
		// passthrough override has to be re-registered per test — a beforeAll
		// would leave every test after the first one unmatched, which MSW then
		// reports as an unhandled request (leaking the token in the process).
		beforeEach(() => {
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
	},
);
