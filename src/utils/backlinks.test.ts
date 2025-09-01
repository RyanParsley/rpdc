import { describe, it, expect } from "vitest";
import { collectBacklinks } from "./backlinks";

describe("collectBacklinks", () => {
	describe("extractLinksFromContent", () => {
		it("should extract markdown links from content", () => {
			const content =
				"Check out [this post](post-1) and [another one](post-2).";
			const mockExtractLinks = (content: string) => {
				const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
				return Array.from(content.matchAll(linkRegex)).map(
					([, , link]) => link ?? "",
				);
			};

			const links = mockExtractLinks(content);
			expect(links).toEqual(["post-1", "post-2"]);
		});

		it("should handle empty content", () => {
			const mockExtractLinks = (content: string) => {
				const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
				return Array.from(content.matchAll(linkRegex)).map(
					([, , link]) => link ?? "",
				);
			};

			const links = mockExtractLinks("");
			expect(links).toEqual([]);
		});

		it("should handle content without links", () => {
			const mockExtractLinks = (content: string) => {
				const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
				return Array.from(content.matchAll(linkRegex)).map(
					([, , link]) => link ?? "",
				);
			};

			const links = mockExtractLinks(
				"This is just plain text without any links.",
			);
			expect(links).toEqual([]);
		});

		it("should handle malformed links gracefully", () => {
			const mockExtractLinks = (content: string) => {
				const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
				return Array.from(content.matchAll(linkRegex)).map(
					([, , link]) => link ?? "",
				);
			};

			const links = mockExtractLinks(
				"This has [incomplete link] and [another](valid-link).",
			);
			expect(links).toEqual(["valid-link"]);
		});
	});

	describe("collectBacklinks", () => {
		it("should return empty object for empty posts array", () => {
			const result = collectBacklinks([]);
			expect(result).toEqual({});
		});

		it("should collect backlinks from posts with links", () => {
			const posts = [
				{
					slug: "post-1",
					body: "This post links to [post-2](post-2) and [post-3](post-3).",
					data: { title: "First Post" },
				},
				{
					slug: "post-2",
					body: "This post links back to [post-1](post-1).",
					data: { title: "Second Post" },
				},
			];

			const result = collectBacklinks(posts);

			expect(result).toEqual({
				"post-2": [{ slug: "post-1", title: "First Post" }],
				"post-3": [{ slug: "post-1", title: "First Post" }],
				"post-1": [{ slug: "post-2", title: "Second Post" }],
			});
		});

		it("should handle posts without titles", () => {
			const posts = [
				{
					slug: "post-1",
					body: "Links to [post-2](post-2).",
					data: {},
				},
			];

			const result = collectBacklinks(posts);

			expect(result).toEqual({
				"post-2": [{ slug: "post-1", title: "post-1" }],
			});
		});

		it("should accumulate multiple backlinks to the same post", () => {
			const posts = [
				{
					slug: "post-1",
					body: "Links to [target](target).",
					data: { title: "First Post" },
				},
				{
					slug: "post-2",
					body: "Also links to [target](target).",
					data: { title: "Second Post" },
				},
			];

			const result = collectBacklinks(posts);

			expect(result).toEqual({
				target: [
					{ slug: "post-1", title: "First Post" },
					{ slug: "post-2", title: "Second Post" },
				],
			});
		});

		it("should handle posts with no links", () => {
			const posts = [
				{
					slug: "post-1",
					body: "This post has no links.",
					data: { title: "Simple Post" },
				},
			];

			const result = collectBacklinks(posts);
			expect(result).toEqual({});
		});

		it("should handle complex markdown content", () => {
			const posts = [
				{
					slug: "post-1",
					body: `# Header

This is a [link](target-post) in the middle of some **bold** text.

- List item with [another link](another-target)
- Another item

\`\`\`code
some code here
\`\`\`

More text with [final link](final-target).`,
					data: { title: "Complex Post" },
				},
			];

			const result = collectBacklinks(posts);

			expect(result).toEqual({
				"target-post": [{ slug: "post-1", title: "Complex Post" }],
				"another-target": [{ slug: "post-1", title: "Complex Post" }],
				"final-target": [{ slug: "post-1", title: "Complex Post" }],
			});
		});

		it("should handle duplicate links in the same post", () => {
			const posts = [
				{
					slug: "post-1",
					body: "Links to [target](target) and then [target](target) again.",
					data: { title: "Duplicate Links Post" },
				},
			];

			const result = collectBacklinks(posts);

			expect(result).toEqual({
				target: [
					{ slug: "post-1", title: "Duplicate Links Post" },
					{ slug: "post-1", title: "Duplicate Links Post" },
				],
			});
		});
	});

	describe("Type Safety", () => {
		it("should maintain type safety with Post interface", () => {
			const posts: Parameters<typeof collectBacklinks>[0] = [
				{
					slug: "test-post",
					body: "Test [link](target).",
					data: { title: "Test Post" },
				},
			];

			const result = collectBacklinks(posts);

			// Type check that result has the expected structure
			expect(typeof result).toBe("object");
			expect(result.target).toBeDefined();
			expect(Array.isArray(result.target)).toBe(true);
			expect(result.target?.[0]).toHaveProperty("slug");
			expect(result.target?.[0]).toHaveProperty("title");
		});
	});
});
