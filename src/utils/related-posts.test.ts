import { describe, expect, it } from "vitest";
import { selectRelatedPosts, type RelatedPostCandidate } from "./related-posts";

const post = (
	id: string,
	title: string,
	pubDate: string,
	extras: Partial<RelatedPostCandidate["data"]> = {},
): RelatedPostCandidate => ({
	id,
	data: {
		title,
		pubDate: new Date(pubDate),
		...extras,
	},
});

const posts: RelatedPostCandidate[] = [
	post("newer", "Newer code post", "2026-01-01", { categories: ["code"] }),
	post("older", "Older code post", "2025-01-01", { categories: ["code"] }),
	post("design", "A design post", "2026-02-01", { categories: ["design"] }),
	post("tagged", "Shares only a tag", "2026-03-01", { tags: ["astro"] }),
	post("self", "The current post", "2026-04-01", { categories: ["code"] }),
	post("draft", "Unpublished", "2026-05-01", {
		categories: ["code"],
		published: false,
	}),
];

describe("selectRelatedPosts", () => {
	it("matches by category, newest first, excluding the current post", () => {
		expect(
			selectRelatedPosts(posts, {
				current: "self",
				categories: ["code"],
			}),
		).toEqual([
			{ id: "newer", title: "Newer code post" },
			{ id: "older", title: "Older code post" },
		]);
	});

	it("drops unpublished entries", () => {
		const ids = selectRelatedPosts(posts, {
			current: "self",
			categories: ["code"],
		}).map(({ id }) => id);

		expect(ids).not.toContain("draft");
	});

	it("falls back to tag overlap when no category matches", () => {
		expect(
			selectRelatedPosts(posts, {
				current: "self",
				categories: ["nothing-used"],
				tags: ["astro"],
			}),
		).toEqual([{ id: "tagged", title: "Shares only a tag" }]);
	});

	it("prefers categories over tags when both could match", () => {
		const mixed = [
			...posts,
			post("both", "Matches both", "2026-06-01", {
				categories: ["code"],
				tags: ["astro"],
			}),
		];

		const ids = selectRelatedPosts(mixed, {
			current: "self",
			categories: ["code"],
			tags: ["astro"],
		}).map(({ id }) => id);

		expect(ids).toContain("both");
		expect(ids).not.toContain("tagged");
	});

	it("returns nothing when neither tier matches", () => {
		expect(
			selectRelatedPosts(posts, {
				current: "self",
				categories: ["solo"],
				tags: ["solo-tag"],
			}),
		).toEqual([]);
	});

	it("returns nothing when the current post has no categories or tags", () => {
		expect(selectRelatedPosts(posts, { current: "self" })).toEqual([]);
	});

	it("caps the result at the limit", () => {
		const many = Array.from({ length: 6 }, (_, index) =>
			post(`p${index}`, `Post ${index}`, `2026-0${index + 1}-01`, {
				categories: ["code"],
			}),
		);

		expect(
			selectRelatedPosts(many, {
				current: "self",
				categories: ["code"],
				limit: 3,
			}),
		).toHaveLength(3);
	});
});
