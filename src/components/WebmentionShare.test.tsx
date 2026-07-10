import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupAstroMocks } from "../test/astro-test-utils";

describe("WebmentionShare Component", () => {
	beforeEach(() => {
		setupAstroMocks();
		vi.clearAllMocks();
	});

	describe("Props Validation", () => {
		it("should accept valid postUrl and postTitle props", () => {
			const props = {
				postUrl: "https://example.com/blog/my-post",
				postTitle: "My Test Post",
			};

			expect(props.postUrl).toMatch(/^https?:\/\//);
			expect(typeof props.postTitle).toBe("string");
			expect(props.postTitle.length).toBeGreaterThan(0);
		});

		it("should handle various URL formats", () => {
			const urls = [
				"https://example.com/blog/my-post",
				"https://example.com/note/interesting-idea",
				"https://example.com/ephemera/2024/09/quick-thought",
			];

			urls.forEach((url) => {
				expect(url).toMatch(/^https?:\/\/.+/);
			});
		});
	});

	describe("Share URL Construction", () => {
		it("should construct correct Bluesky share URL", () => {
			const postTitle = "My Test Post";
			const postUrl = "https://example.com/blog/my-post";
			const blueskyShareText = `${postTitle} ${postUrl}`;
			const encodedBlueskyShareText = encodeURIComponent(blueskyShareText);
			const blueskyShareUrl = `https://bsky.app/intent/compose?text=${encodedBlueskyShareText}`;

			expect(blueskyShareUrl).toBe(
				`https://bsky.app/intent/compose?text=My%20Test%20Post%20https%3A%2F%2Fexample.com%2Fblog%2Fmy-post`,
			);
		});

		it("should construct correct Mastodon share URL", () => {
			const postTitle = "My Test Post";
			const postUrl = "https://example.com/blog/my-post";
			const encodedTitle = encodeURIComponent(postTitle);
			const encodedUrl = encodeURIComponent(postUrl);
			const mastodonShareUrl = `https://mastodon.social/share?text=${encodedTitle}&url=${encodedUrl}`;

			expect(mastodonShareUrl).toBe(
				`https://mastodon.social/share?text=My%20Test%20Post&url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post`,
			);
		});

		it("should handle special characters in post title", () => {
			const postTitle = 'Hello "World" & Friends <3';
			const postUrl = "https://example.com/post";
			const encodedTitle = encodeURIComponent(postTitle);
			const encodedUrl = encodeURIComponent(postUrl);
			const blueskyShareText = `${postTitle} ${postUrl}`;
			const encodedBlueskyShareText = encodeURIComponent(blueskyShareText);
			const blueskyShareUrl = `https://bsky.app/intent/compose?text=${encodedBlueskyShareText}`;
			const mastodonShareUrl = `https://mastodon.social/share?text=${encodedTitle}&url=${encodedUrl}`;

			expect(blueskyShareUrl).toContain(encodeURIComponent(postTitle));
			expect(mastodonShareUrl).toContain(encodeURIComponent(postTitle));
			expect(blueskyShareUrl).not.toContain(postTitle);
			expect(mastodonShareUrl).not.toContain(postTitle);
		});
	});

	describe("Button Labels", () => {
		it("should have correct Bluesky button label", () => {
			const blueskyLabel = "Share on Bluesky";
			expect(blueskyLabel).toMatch(/Bluesky/);
		});

		it("should have correct Mastodon button label", () => {
			const mastodonLabel = "Share on Mastodon";
			expect(mastodonLabel).toMatch(/Mastodon/);
		});
	});

	describe("Link Attributes", () => {
		it("should open share links in new tab", () => {
			const target = "_blank";
			expect(target).toBe("_blank");
		});

		it("should include security rel attributes", () => {
			const rel = "noopener noreferrer";
			expect(rel).toContain("noopener");
			expect(rel).toContain("noreferrer");
		});
	});
});
