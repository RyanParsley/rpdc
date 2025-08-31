import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies
vi.mock("fs");
vi.mock("gray-matter");

// Mock path module with importOriginal
vi.mock("path", async (importOriginal) => {
	const actual = (await importOriginal()) as typeof import("path");
	return {
		...actual,
		join: vi.fn((...args) => args.join("/")),
		extname: vi.fn((filename: string) => {
			const lastDot = filename.lastIndexOf(".");
			return lastDot === -1 ? "" : filename.slice(lastDot);
		}),
	};
});

// Import the functions to test
import {
	generatePostContent,
	cleanContentForSocial,
	getMimeType,
	type EphemeraPost,
	type EphemeraData,
	type ImageData,
} from "./posse";

describe("POSSE Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("generatePostContent", () => {
		it("should generate content from post body when available", () => {
			const data: EphemeraData = {
				title: "Test Post",
				date: new Date(),
			};
			const body =
				"This is the post content with **bold** text and [link](url).";
			const canonicalUrl = "https://example.com/post";

			const result = generatePostContent(data, canonicalUrl, body, "mastodon");

			expect(result).toContain("This is the post content");
			expect(result).toContain(canonicalUrl);
			expect(result).toContain("bold"); // Should preserve text after cleaning markdown
		});

		it("should fall back to title when body is empty", () => {
			const data: EphemeraData = {
				title: "Test Post Title",
				date: new Date(),
			};
			const canonicalUrl = "https://example.com/post";

			const result = generatePostContent(data, canonicalUrl, "", "mastodon");

			expect(result).toContain("Test Post Title");
			expect(result).toContain(canonicalUrl);
		});

		it("should truncate content for Bluesky (280 chars)", () => {
			const data: EphemeraData = {
				title: "Test Post",
				date: new Date(),
			};
			const longBody = "A".repeat(300); // Longer than 280 chars
			const canonicalUrl = "https://example.com/post";

			const result = generatePostContent(
				data,
				canonicalUrl,
				longBody,
				"bluesky",
			);

			expect(result.length).toBeLessThanOrEqual(280 + canonicalUrl.length + 10); // Allow some buffer
			expect(result).toContain("..."); // Should be truncated
		});

		it("should handle Mastodon character limit (400 chars)", () => {
			const data: EphemeraData = {
				title: "Test Post",
				date: new Date(),
			};
			const longBody = "A".repeat(450); // Longer than 400 chars
			const canonicalUrl = "https://example.com/post";

			const result = generatePostContent(
				data,
				canonicalUrl,
				longBody,
				"mastodon",
			);

			expect(result.length).toBeLessThanOrEqual(400 + canonicalUrl.length + 10);
			expect(result).toContain("...");
		});
	});

	describe("cleanContentForSocial", () => {
		it("should convert markdown headers to readable format", () => {
			const markdown = "# Main Header\n## Sub Header\n### Sub-sub Header";
			const result = cleanContentForSocial(markdown);

			expect(result).toContain("Main Header");
			expect(result).toContain("Sub Header");
			expect(result).toContain("• Sub-sub Header");
		});

		it("should remove markdown links but keep text", () => {
			const markdown =
				"Check out [this link](https://example.com) for more info.";
			const result = cleanContentForSocial(markdown);

			expect(result).toContain("Check out this link for more info.");
			expect(result).not.toContain("https://example.com");
			expect(result).not.toContain("[");
			expect(result).not.toContain("]");
		});

		it("should remove markdown formatting", () => {
			const markdown = "This is **bold** and *italic* text.";
			const result = cleanContentForSocial(markdown);

			expect(result).toContain("This is bold and italic text.");
			expect(result).not.toContain("**");
			expect(result).not.toContain("*");
		});

		it("should replace code blocks with placeholder", () => {
			const markdown = "Here is some code:\n```\nconst x = 1;\n```";
			const result = cleanContentForSocial(markdown);

			expect(result).toContain("[code block]");
			expect(result).not.toContain("const x = 1;");
		});

		it("should clean up excessive whitespace", () => {
			const markdown = "Line 1\n\n\n\n\nLine 2\t\t\t\tLine 3";
			const result = cleanContentForSocial(markdown);

			expect(result).toContain("Line 1\n\nLine 2 Line 3");
			expect(result).not.toContain("\t");
		});

		it("should preserve paragraph breaks", () => {
			const markdown = "Paragraph 1\n\nParagraph 2\n\nParagraph 3";
			const result = cleanContentForSocial(markdown);

			expect(result).toContain("Paragraph 1\n\nParagraph 2\n\nParagraph 3");
		});
	});

	describe("getMimeType", () => {
		it("should return correct MIME types for image extensions", () => {
			expect(getMimeType("image.jpg")).toBe("image/jpeg");
			expect(getMimeType("image.jpeg")).toBe("image/jpeg");
			expect(getMimeType("image.png")).toBe("image/png");
			expect(getMimeType("image.gif")).toBe("image/gif");
			expect(getMimeType("image.webp")).toBe("image/webp");
		});

		it("should default to JPEG for unknown extensions", () => {
			expect(getMimeType("image.bmp")).toBe("image/jpeg");
			expect(getMimeType("image.tiff")).toBe("image/jpeg");
			expect(getMimeType("image")).toBe("image/jpeg");
		});

		it("should handle uppercase extensions", () => {
			expect(getMimeType("image.JPG")).toBe("image/jpeg");
			expect(getMimeType("image.PNG")).toBe("image/png");
		});
	});

	describe("Type Safety", () => {
		it("should properly type EphemeraPost interface", () => {
			const post: EphemeraPost = {
				file: "test-post.md",
				data: {
					title: "Test Post",
					date: new Date(),
					syndication: [],
				},
				body: "Test content",
				image: {
					src: "/images/test.jpg",
					alt: "Test image",
				},
			};

			expect(post.file).toBe("test-post.md");
			expect(post.data.title).toBe("Test Post");
			expect(post.body).toBe("Test content");
			expect(post.image?.src).toBe("/images/test.jpg");
		});

		it("should handle optional properties correctly", () => {
			const postWithoutImage: EphemeraPost = {
				file: "test-post.md",
				data: {
					title: "Test Post",
					date: new Date(),
				},
				body: "Test content",
			};

			expect(postWithoutImage.image).toBeUndefined();
			expect(postWithoutImage.data.syndication).toBeUndefined();
		});

		it("should properly type ImageData interface", () => {
			const image: ImageData = {
				src: "/images/test.jpg",
				alt: "Test image description",
			};

			expect(image.src).toBe("/images/test.jpg");
			expect(image.alt).toBe("Test image description");
		});
	});
});
