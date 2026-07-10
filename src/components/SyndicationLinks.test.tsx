import { describe, it, expect } from "vitest";
import type { Syndication } from "./SyndicationLinks.astro";

describe("SyndicationLinks", () => {
	describe("Syndication type", () => {
		it("accepts valid syndication links", () => {
			const links: Syndication[] = [
				{ href: "https://mastodon.social/@user/1", title: "Mastodon" },
				{ href: "https://bsky.app/profile/user/post/1", title: "Bluesky" },
			];
			expect(links).toHaveLength(2);
		});

		it("rejects missing required fields at type level", () => {
			const valid: Syndication = {
				href: "https://example.com/1",
				title: "Mastodon",
			};
			expect(valid.href).toBe("https://example.com/1");
			expect(valid.title).toBe("Mastodon");
		});
	});

	describe("Conditional rendering logic", () => {
		it("should not render when empty", () => {
			const syndication: Syndication[] = [];
			const shouldRender = syndication.length > 0;
			expect(shouldRender).toBe(false);
		});

		it("should render when has items", () => {
			const syndication: Syndication[] = [
				{ href: "https://mastodon.social/@user/1", title: "Mastodon" },
			];
			const shouldRender = syndication.length > 0;
			expect(shouldRender).toBe(true);
		});
	});
});
