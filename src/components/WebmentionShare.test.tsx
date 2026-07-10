import { describe, it, expect } from "vitest";
import {
	buildBlueskyShareUrl,
	buildMastodonShareUrl,
} from "../utils/webmentions";

describe("buildBlueskyShareUrl", () => {
	it("constructs correct Bluesky share URL", () => {
		const url = buildBlueskyShareUrl("My Post", "https://example.com/post");

		expect(url).toBe(
			"https://bsky.app/intent/compose?text=My%20Post%20https%3A%2F%2Fexample.com%2Fpost",
		);
	});

	it("encodes special characters in title", () => {
		const url = buildBlueskyShareUrl(
			'Hello "World" & Friends',
			"https://example.com/post",
		);

		expect(url).toContain(encodeURIComponent('Hello "World" & Friends'));
		expect(url).not.toContain('Hello "World"');
	});
});

describe("buildMastodonShareUrl", () => {
	it("constructs correct Mastodon share URL", () => {
		const url = buildMastodonShareUrl("My Post", "https://example.com/post");

		expect(url).toBe(
			"https://mastodon.social/share?text=My%20Post&url=https%3A%2F%2Fexample.com%2Fpost",
		);
	});

	it("uses custom Mastodon instance", () => {
		const url = buildMastodonShareUrl(
			"My Post",
			"https://example.com/post",
			"hachyderm.io",
		);

		expect(url).toContain("https://hachyderm.io/share?");
	});

	it("encodes special characters in title", () => {
		const url = buildMastodonShareUrl(
			'Hello "World" & Friends',
			"https://example.com/post",
		);

		expect(url).toContain(encodeURIComponent('Hello "World" & Friends'));
		expect(url).not.toContain('Hello "World"');
	});
});
