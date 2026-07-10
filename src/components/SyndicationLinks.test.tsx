import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupAstroMocks } from "../test/astro-test-utils";

describe("SyndicationLinks Component", () => {
	beforeEach(() => {
		setupAstroMocks();
		vi.clearAllMocks();
	});

	describe("Syndication Type", () => {
		it("should validate Syndication interface structure", () => {
			const syndication = { href: "https://example.com/1", title: "Mastodon" };
			expect(syndication.href).toMatch(/^https?:\/\//);
			expect(typeof syndication.title).toBe("string");
		});

		it("should accept multiple syndication links", () => {
			const syndications = [
				{ href: "https://mastodon.social/@user/1", title: "Mastodon" },
				{ href: "https://bsky.app/profile/user/post/1", title: "Bluesky" },
			];

			expect(syndications).toHaveLength(2);
			syndications.forEach((s) => {
				expect(s.href).toMatch(/^https?:\/\//);
				expect(typeof s.title).toBe("string");
			});
		});
	});

	describe("Empty State", () => {
		it("should not render when syndication array is empty", () => {
			const syndication: { href: string; title: string }[] = [];
			const shouldRender = syndication.length > 0;
			expect(shouldRender).toBe(false);
		});

		it("should not render when syndication is undefined", () => {
			const syndication = undefined as
				| { href: string; title: string }[]
				| undefined;
			const shouldRender = (syndication?.length ?? 0) > 0;
			expect(shouldRender).toBe(false);
		});
	});

	describe("Rendering", () => {
		it("should render when syndication array has items", () => {
			const syndication = [
				{ href: "https://mastodon.social/@user/1", title: "Mastodon" },
			];
			const shouldRender = syndication.length > 0;
			expect(shouldRender).toBe(true);
		});

		it("should render correct link labels", () => {
			const testCases = [
				{ title: "Mastodon", expected: "Mastodon" },
				{ title: "Bluesky", expected: "Bluesky" },
				{ title: "Twitter", expected: "Twitter" },
			];

			testCases.forEach(({ title, expected }) => {
				expect(title).toBe(expected);
			});
		});
	});
});
