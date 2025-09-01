import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
	validateConfig,
	validateMastodonConfig,
	validateBlueskyConfig,
	getPlatformConfig,
	scanEphemeraPosts,
	findMarkdownFiles,
	parseEphemeraFile,
} from "./posse";
import type { EphemeraPost, EphemeraData, Logger } from "./posse";

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
	});

	describe("Configuration Validation", () => {
		describe("validateMastodonConfig", () => {
			it("should return false for undefined config", () => {
				expect(validateMastodonConfig()).toBe(false);
				expect(validateMastodonConfig(undefined)).toBe(false);
			});

			it("should return false for missing token", () => {
				expect(validateMastodonConfig({ instance: "mastodon.social" })).toBe(
					false,
				);
			});

			it("should return false for missing instance", () => {
				expect(validateMastodonConfig({ token: "valid-token" })).toBe(false);
			});

			it("should return false for missing instance", () => {
				expect(
					validateMastodonConfig({ token: "valid-token" } as { token: string }),
				).toBe(false);
			});

			it("should return false for missing instance", () => {
				expect(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					validateMastodonConfig({ token: "valid-token" } as any),
				).toBe(false);
			});

			it("should return false for missing instance", () => {
				expect(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					validateMastodonConfig({ token: "valid-token" } as any),
				).toBe(false);
			});

			it("should return false for token too short", () => {
				expect(
					validateMastodonConfig({
						token: "short",
						instance: "mastodon.social",
					}),
				).toBe(false);
			});

			it("should return false for invalid instance format", () => {
				expect(
					validateMastodonConfig({
						token: "valid-token-12345",
						instance: "invalid",
					}),
				).toBe(false);
			});

			it("should return true for valid config", () => {
				expect(
					validateMastodonConfig({
						token: "valid-token-12345",
						instance: "mastodon.social",
					}),
				).toBe(true);
			});
		});

		describe("validateBlueskyConfig", () => {
			it("should return false for undefined config", () => {
				expect(validateBlueskyConfig()).toBe(false);
				expect(validateBlueskyConfig(undefined)).toBe(false);
			});

			it("should return false for missing username", () => {
				expect(validateBlueskyConfig({ password: "password" })).toBe(false);
			});

			it("should return false for missing password", () => {
				expect(validateBlueskyConfig({ username: "user.bsky.social" })).toBe(
					false,
				);
			});

			it("should return false for missing password", () => {
				expect(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					validateBlueskyConfig({ username: "user.bsky.social" } as any),
				).toBe(false);
			});

			it("should return false for invalid username format", () => {
				expect(
					validateBlueskyConfig({
						username: "invalid",
						password: "password",
					}),
				).toBe(false);
			});

			it("should return true for valid config", () => {
				expect(
					validateBlueskyConfig({
						username: "user.bsky.social",
						password: "password123",
					}),
				).toBe(true);
			});
		});

		describe("validateConfig", () => {
			it("should return default config for empty options", () => {
				const result = validateConfig();
				expect(result).toEqual({
					mastodon: false,
					bluesky: false,
					dryRun: false,
					maxPosts: 3,
				});
			});

			it("should validate Mastodon config correctly", () => {
				const result = validateConfig({
					mastodon: { token: "valid-token-12345", instance: "mastodon.social" },
				});
				expect(result.mastodon).toBe(true);
			});

			it("should validate Bluesky config correctly", () => {
				const result = validateConfig({
					bluesky: { username: "user.bsky.social", password: "password" },
				});
				expect(result.bluesky).toBe(true);
			});

			it("should handle dry run option", () => {
				const result = validateConfig({ dryRun: true });
				expect(result.dryRun).toBe(true);
			});

			it("should handle maxPosts option", () => {
				const result = validateConfig({ maxPosts: 5 });
				expect(result.maxPosts).toBe(5);
			});
		});

		describe("getPlatformConfig", () => {
			const originalEnv = process.env;

			beforeEach(() => {
				// Reset environment variables
				process.env = { ...originalEnv };
				delete process.env.MASTODON_ACCESS_TOKEN;
				delete process.env.MASTODON_INSTANCE;
				delete process.env.BLUESKY_USERNAME;
				delete process.env.BLUESKY_PASSWORD;
			});

			afterEach(() => {
				process.env = originalEnv;
			});

			it("should return undefined for all platforms when no env vars", () => {
				const result = getPlatformConfig();
				expect(result.mastodon).toBeUndefined();
				expect(result.bluesky).toBeUndefined();
			});

			it("should return Mastodon config when env vars are set", () => {
				process.env.MASTODON_ACCESS_TOKEN = "test-token";
				process.env.MASTODON_INSTANCE = "mastodon.social";

				const result = getPlatformConfig();
				expect(result.mastodon).toEqual({
					token: "test-token",
					instance: "mastodon.social",
				});
			});

			it("should return Bluesky config when env vars are set", () => {
				process.env.BLUESKY_USERNAME = "user.bsky.social";
				process.env.BLUESKY_PASSWORD = "password";

				const result = getPlatformConfig();
				expect(result.bluesky).toEqual({
					username: "user.bsky.social",
					password: "password",
				});
			});

			it("should return partial config when only some env vars are set", () => {
				process.env.MASTODON_ACCESS_TOKEN = "test-token";
				// Missing MASTODON_INSTANCE
				process.env.BLUESKY_USERNAME = "user.bsky.social";
				// Missing BLUESKY_PASSWORD

				const result = getPlatformConfig();
				expect(result.mastodon).toBeUndefined();
				expect(result.bluesky).toBeUndefined();
			});
		});
	});

	describe("File Scanning", () => {
		let mockLogger: Logger;
		let mockReaddirSync: ReturnType<typeof vi.fn>;
		let mockStatSync: ReturnType<typeof vi.fn>;
		let mockReadFileSync: ReturnType<typeof vi.fn>;
		let mockMatter: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockLogger = {
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			};

			mockReaddirSync = vi.fn();
			mockStatSync = vi.fn();
			mockReadFileSync = vi.fn();
			mockMatter = vi.fn();
		});

		describe("findMarkdownFiles", () => {
			it("should find markdown files in directory", () => {
				mockReaddirSync.mockReturnValue(
					[
						{
							item: "test1.md",
							fullPath: "/path/test1.md",
							stat: { isDirectory: () => false },
						},
						{
							item: "test2.md",
							fullPath: "/path/test2.md",
							stat: { isDirectory: () => false },
						},
						{
							item: "not-md.txt",
							fullPath: "/path/not-md.txt",
							stat: { isDirectory: () => false },
						},
					].map(({ item, stat }) => {
						mockStatSync.mockReturnValue(stat);
						return item;
					}),
				);

				const result = findMarkdownFiles(
					"/test/dir",
					new Date("2025-08-30"),
					mockLogger,
				);

				expect(result).toEqual(["/path/test1.md", "/path/test2.md"]);
			});

			it("should filter files by date pattern", () => {
				mockReaddirSync.mockReturnValue([
					"2025-08-31-test.md",
					"2025-08-29-old.md", // Should be filtered out
					"no-date.md",
				]);

				mockStatSync.mockReturnValue({ isDirectory: () => false });

				const result = findMarkdownFiles(
					"/test/dir",
					new Date("2025-08-30"),
					mockLogger,
				);

				expect(result).toContain("/test/dir/2025-08-31-test.md");
				expect(result).toContain("/test/dir/no-date.md");
				expect(result).not.toContain("/test/dir/2025-08-29-old.md");
			});

			it("should handle directory scanning recursively", () => {
				mockReaddirSync
					.mockReturnValueOnce(["subdir", "file.md"]) // Root directory
					.mockReturnValueOnce(["nested.md"]); // Subdirectory

				mockStatSync
					.mockReturnValueOnce({ isDirectory: () => true }) // subdir
					.mockReturnValueOnce({ isDirectory: () => false }) // file.md
					.mockReturnValueOnce({ isDirectory: () => false }); // nested.md

				const result = findMarkdownFiles(
					"/test/dir",
					new Date("2025-08-30"),
					mockLogger,
				);

				expect(result).toEqual([
					"/test/dir/file.md",
					"/test/dir/subdir/nested.md",
				]);
			});
		});

		describe("parseEphemeraFile", () => {
			it("should parse valid markdown file", () => {
				const mockFileContent = `---
title: Test Post
date: 2025-08-31
---

This is the content.`;

				mockReadFileSync.mockReturnValue(mockFileContent);
				mockMatter.mockReturnValue({
					data: { title: "Test Post", date: new Date("2025-08-31") },
					content: "This is the content.",
				});

				const result = parseEphemeraFile(
					"/path/test.md",
					new Date("2025-08-30"),
					mockLogger,
				);

				expect(result).toEqual({
					file: "test.md",
					data: { title: "Test Post", date: new Date("2025-08-31") },
					body: "This is the content.",
					image: undefined,
				});
			});

			it("should skip files before legacy cutoff", () => {
				mockReadFileSync.mockReturnValue("---\ndate: 2025-08-29\n---\ncontent");
				mockMatter.mockReturnValue({
					data: { date: new Date("2025-08-29") },
					content: "content",
				});

				const result = parseEphemeraFile(
					"/path/old.md",
					new Date("2025-08-30"),
					mockLogger,
				);

				expect(result).toBeNull();
			});

			it("should skip already fully syndicated posts", () => {
				const mockFileContent = `---
title: Test Post
date: 2025-08-31
syndication:
  - href: https://mastodon.social/post/1
    title: Mastodon
  - href: https://bsky.app/post/1
    title: Bluesky
---

Content`;

				mockReadFileSync.mockReturnValue(mockFileContent);
				mockMatter.mockReturnValue({
					data: {
						title: "Test Post",
						date: new Date("2025-08-31"),
						syndication: [
							{ href: "https://mastodon.social/post/1", title: "Mastodon" },
							{ href: "https://bsky.app/post/1", title: "Bluesky" },
						],
					},
					content: "Content",
				});

				// Mock environment variables for configured platforms
				const originalEnv = process.env;
				process.env.MASTODON_ACCESS_TOKEN = "token";
				process.env.MASTODON_INSTANCE = "mastodon.social";
				process.env.BLUESKY_USERNAME = "user.bsky.social";
				process.env.BLUESKY_PASSWORD = "password";

				const result = parseEphemeraFile(
					"/path/test.md",
					new Date("2025-08-30"),
					mockLogger,
				);

				expect(result).toBeNull();

				// Restore environment
				process.env = originalEnv;
			});

			it("should handle file read errors gracefully", () => {
				mockReadFileSync.mockImplementation(() => {
					throw new Error("File not found");
				});

				const result = parseEphemeraFile(
					"/path/missing.md",
					new Date("2025-08-30"),
					mockLogger,
				);

				expect(result).toBeNull();
				expect(mockLogger.warn).toHaveBeenCalled();
			});
		});

		describe("scanEphemeraPosts", () => {
			it("should scan and return recent posts", () => {
				// Mock the file system functions
				mockReaddirSync.mockReturnValue(["test.md"]);
				mockStatSync.mockReturnValue({ isDirectory: () => false });
				mockReadFileSync.mockReturnValue(
					"---\ntitle: Test\ndate: 2025-08-31\n---\ncontent",
				);
				mockMatter.mockReturnValue({
					data: { title: "Test", date: new Date("2025-08-31") },
					content: "content",
				});

				const result = scanEphemeraPosts(5, mockLogger);

				expect(result).toHaveLength(1);
				expect(result[0]?.data.title).toBe("Test");
			});

			it("should limit results to maxPosts", () => {
				mockReaddirSync.mockReturnValue(["test1.md", "test2.md", "test3.md"]);
				mockStatSync.mockReturnValue({ isDirectory: () => false });
				mockReadFileSync.mockReturnValue(
					"---\ntitle: Test\ndate: 2025-08-31\n---\ncontent",
				);
				mockMatter.mockReturnValue({
					data: { title: "Test", date: new Date("2025-08-31") },
					content: "content",
				});

				const result = scanEphemeraPosts(2, mockLogger);

				expect(result).toHaveLength(2);
			});

			it("should handle scanning errors gracefully", () => {
				mockReaddirSync.mockImplementation(() => {
					throw new Error("Directory not found");
				});

				const result = scanEphemeraPosts(5, mockLogger);

				expect(result).toEqual([]);
				expect(mockLogger.error).toHaveBeenCalled();
			});
		});
	});
});
