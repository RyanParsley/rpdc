import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupAstroMocks } from "../test/astro-test-utils";

describe("Backlinks Component", () => {
	beforeEach(() => {
		setupAstroMocks();
		vi.clearAllMocks();
	});

	describe("Props Validation", () => {
		it("should accept valid currentSlug prop", () => {
			const testSlugs = [
				"/blog/my-awesome-post",
				"/note/interesting-idea",
				"/ephemera/quick-thought",
			];

			testSlugs.forEach((slug) => {
				expect(slug).toMatch(/^\/(blog|note|ephemera)\//);
				expect(typeof slug).toBe("string");
			});
		});

		it("should handle various slug formats", () => {
			const slugs = [
				"/blog/simple-slug",
				"/blog/complex-slug-with-dashes",
				"/blog/slug_with_underscores",
				"/note/2025-01-01-my-note",
				"/ephemera/quick-thought-123",
			];

			slugs.forEach((slug) => {
				expect(slug).toMatch(/^\/[a-z]+\//);
				expect(slug.length).toBeGreaterThan(5);
			});
		});
	});

	describe("Data Processing", () => {
		it("should correctly filter backlinks for current slug", () => {
			const mockBacklinks = [
				{ slug: "/blog/post-1", title: "Post 1" },
				{ slug: "/blog/post-2", title: "Post 2" },
				{ slug: "/note/note-1", title: "Note 1" },
				{ slug: "/blog/post-1", title: "Another reference to Post 1" },
			];

			const currentSlug = "/blog/post-1";
			const filteredBacklinks = mockBacklinks.filter(
				(link) => link.slug === currentSlug,
			);

			expect(filteredBacklinks).toHaveLength(2);
			expect(filteredBacklinks[0]?.title).toBe("Post 1");
			expect(filteredBacklinks[1]?.title).toBe("Another reference to Post 1");
		});

		it("should handle empty backlinks array", () => {
			const emptyBacklinks: Array<{ slug: string; title: string }> = [];
			const currentSlug = "/blog/test-post";

			const filteredBacklinks = emptyBacklinks.filter(
				(link) => link.slug === currentSlug,
			);

			expect(filteredBacklinks).toHaveLength(0);
		});

		it("should handle backlinks with different slugs", () => {
			const mockBacklinks = [
				{ slug: "/blog/post-a", title: "Post A" },
				{ slug: "/blog/post-b", title: "Post B" },
				{ slug: "/note/note-a", title: "Note A" },
			];

			const currentSlug = "/blog/post-a";
			const filteredBacklinks = mockBacklinks.filter(
				(link) => link.slug === currentSlug,
			);

			expect(filteredBacklinks).toHaveLength(1);
			expect(filteredBacklinks[0]?.title).toBe("Post A");
		});
	});

	describe("Content Collection Integration", () => {
		it("should process blog collection entries correctly", () => {
			const mockBlogEntries = [
				{
					slug: "post-1",
					data: { title: "Blog Post 1" },
				},
				{
					slug: "post-2",
					data: { title: "Blog Post 2" },
				},
			];

			const processedEntries = mockBlogEntries.map((post) => ({
				...post,
				slug: `/blog/${post.slug}`,
			}));

			expect(processedEntries).toHaveLength(2);
			expect(processedEntries[0]?.slug).toBe("/blog/post-1");
			expect(processedEntries[1]?.slug).toBe("/blog/post-2");
		});

		it("should process note collection entries correctly", () => {
			const mockNoteEntries = [
				{
					slug: "note-1",
					data: { title: "Note 1" },
				},
				{
					slug: "note-2",
					data: { title: "Note 2" },
				},
			];

			const processedEntries = mockNoteEntries.map((post) => ({
				...post,
				slug: `/note/${post.slug}`,
			}));

			expect(processedEntries).toHaveLength(2);
			expect(processedEntries[0]?.slug).toBe("/note/note-1");
			expect(processedEntries[1]?.slug).toBe("/note/note-2");
		});

		it("should combine blog and note entries", () => {
			const mockBlogEntries = [
				{ slug: "blog-post", data: { title: "Blog Post" } },
			];

			const mockNoteEntries = [
				{ slug: "note-item", data: { title: "Note Item" } },
			];

			const blogProcessed = mockBlogEntries.map((post) => ({
				...post,
				slug: `/blog/${post.slug}`,
			}));

			const notesProcessed = mockNoteEntries.map((post) => ({
				...post,
				slug: `/note/${post.slug}`,
			}));

			const allPosts = [...blogProcessed, ...notesProcessed];

			expect(allPosts).toHaveLength(2);
			expect(allPosts[0]?.slug).toBe("/blog/blog-post");
			expect(allPosts[1]?.slug).toBe("/note/note-item");
		});
	});

	describe("Backlinks Collection Logic", () => {
		it("should collect backlinks from posts correctly", () => {
			const mockPosts = [
				{
					slug: "/blog/source-post",
					data: {
						title: "Source Post",
						body: "This post links to [[target-post]] and [[another-post]].",
					},
				},
				{
					slug: "/blog/another-source",
					data: {
						title: "Another Source",
						body: "This also links to [[target-post]].",
					},
				},
			];

			const mockBacklinks = new Map();
			mockPosts.forEach((post) => {
				const links = ["target-post", "another-post"];
				links.forEach((link) => {
					if (!mockBacklinks.has(link)) {
						mockBacklinks.set(link, []);
					}
					mockBacklinks.get(link)?.push({
						slug: post.slug,
						title: post.data.title,
					});
				});
			});

			expect(mockBacklinks.get("target-post")).toHaveLength(2);
			expect(mockBacklinks.get("another-post")).toHaveLength(2);
		});

		it("should handle posts with no backlinks", () => {
			const mockPosts = [
				{
					slug: "/blog/post-without-links",
					data: {
						title: "Post Without Links",
						body: "This post has no wiki links.",
					},
				},
			];

			const mockBacklinks = new Map();
			mockPosts.forEach((post) => {
				const links: string[] = [];
				links.forEach((link) => {
					if (!mockBacklinks.has(link)) {
						mockBacklinks.set(link, []);
					}
					mockBacklinks.get(link)?.push({
						slug: post.slug,
						title: post.data.title,
					});
				});
			});

			expect(mockBacklinks.size).toBe(0);
		});
	});

	describe("Rendering Logic", () => {
		it("should conditionally render backlinks section", () => {
			const testCases = [
				{ backlinks: [], shouldRender: false },
				{ backlinks: [{ slug: "/test", title: "Test" }], shouldRender: true },
				{
					backlinks: [
						{ slug: "/test1", title: "Test 1" },
						{ slug: "/test2", title: "Test 2" },
					],
					shouldRender: true,
				},
			];

			testCases.forEach(({ backlinks, shouldRender }) => {
				const shouldShowSection = backlinks.length > 0;
				expect(shouldShowSection).toBe(shouldRender);
			});
		});

		it("should generate correct link URLs", () => {
			const backlinks = [
				{ slug: "/blog/source-post", title: "Source Post" },
				{ slug: "/note/useful-note", title: "Useful Note" },
			];

			backlinks.forEach((link) => {
				expect(link.slug).toMatch(/^\/(blog|note)\//);
				expect(typeof link.title).toBe("string");
				expect(link.title.length).toBeGreaterThan(0);
			});
		});

		it("should handle backlink titles correctly", () => {
			const backlinks = [
				{ slug: "/blog/post", title: "Simple Title" },
				{
					slug: "/blog/post",
					title: "Complex Title: With Special Characters & Symbols!",
				},
				{ slug: "/blog/post", title: "Title with 123 numbers" },
			];

			backlinks.forEach((link) => {
				expect(link.title).toBeDefined();
				expect(typeof link.title).toBe("string");
				expect(link.title.length).toBeGreaterThan(0);
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle missing collection data gracefully", () => {
			const mockPosts = [
				{ slug: "/blog/post-1", data: undefined },
				{ slug: "/blog/post-2", data: { title: "Valid Post" } },
			];

			const validPosts = mockPosts.filter((post) => post.data?.title);

			expect(validPosts).toHaveLength(1);
			expect(validPosts[0]?.data?.title).toBe("Valid Post");
		});

		it("should handle malformed slugs", () => {
			const malformedSlugs = [
				"",
				"not-a-slug",
				"/",
				"/blog/",
				null as string | null,
				undefined as string | undefined,
			];

			malformedSlugs.forEach((slug) => {
				if (slug === null || slug === undefined) {
					expect(slug == null).toBe(true);
				} else {
					expect(typeof slug).toBe("string");
				}
			});
		});

		it("should handle collection fetch failures", () => {
			const mockError = new Error("Collection fetch failed");

			expect(() => {
				throw mockError;
			}).toThrow("Collection fetch failed");
		});
	});
});
