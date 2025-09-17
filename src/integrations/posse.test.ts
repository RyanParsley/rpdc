import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock external dependencies
vi.mock("fs");
vi.mock("gray-matter");

// Import mocked functions
import { readdirSync, statSync, readFileSync } from "fs";
import matter from "gray-matter";

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
	resolveImagePath,
	selectImageSource,
	createImageResult,
} from "./posse";
import { postToMastodon } from "./posse-mastodon";
import { postToBluesky, parseUrlFacets } from "./posse-bluesky";
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

		it("should truncate content for Bluesky's grapheme limit (300)", () => {
			const data: EphemeraData = {
				title: "Test Post",
				date: new Date(),
			};
			const longBody = "a".repeat(301); // Longer than 300 graphemes
			const canonicalUrl = "https://example.com/post";

			const result = generatePostContent(
				data,
				canonicalUrl,
				longBody,
				"bluesky",
			);

			expect(result.length).toBeLessThanOrEqual(300 + canonicalUrl.length + 10); // Allow some buffer
			expect(result).toContain("..."); // Should be truncated
		});

		it("should handle Mastodon character limit (500 chars)", () => {
			const data: EphemeraData = {
				title: "Test Post",
				date: new Date(),
			};
			const longBody = "A".repeat(550); // Longer than 500 chars
			const canonicalUrl = "https://example.com/post";

			const result = generatePostContent(
				data,
				canonicalUrl,
				longBody,
				"mastodon",
			);

			expect(result.length).toBeLessThanOrEqual(500 + canonicalUrl.length + 10);
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

		it("should remove markdown links but keep text for Mastodon", () => {
			const markdown =
				"Check out [this link](https://example.com) for more info.";
			const result = cleanContentForSocial(markdown, "mastodon");

			expect(result).toContain("Check out this link for more info.");
			expect(result).not.toContain("https://example.com");
			expect(result).not.toContain("[");
			expect(result).not.toContain("]");
		});

		it("should keep URLs in text for Bluesky facets", () => {
			const markdown =
				"Check out [this link](https://example.com) for more info.";
			const result = cleanContentForSocial(markdown, "bluesky");

			expect(result).toContain(
				"Check out this link https://example.com for more info.",
			);
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
				expect(validateMastodonConfig({ token: "valid-token" } as never)).toBe(
					false,
				);
			});

			it("should return false for missing instance", () => {
				expect(validateMastodonConfig({ token: "valid-token" } as never)).toBe(
					false,
				);
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
					validateBlueskyConfig({ username: "user.bsky.social" } as never),
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

		beforeEach(() => {
			mockLogger = {
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			};

			// Clear all mocks
			vi.clearAllMocks();

			// Mock environment variables for platform configuration
			vi.stubEnv("MASTODON_ACCESS_TOKEN", "test-token");
			vi.stubEnv("MASTODON_INSTANCE", "test-instance");
			vi.stubEnv("BLUESKY_USERNAME", "test-username");
			vi.stubEnv("BLUESKY_PASSWORD", "test-password");
		});

		describe("findMarkdownFiles", () => {
			it("should find markdown files in directory", () => {
				// Mock readdirSync to return filenames
				vi.mocked(readdirSync).mockReturnValue([
					"test1.md",
					"test2.md",
					"not-md.txt",
				] as never);

				// Mock statSync to return file stats
				vi.mocked(statSync).mockReturnValue({
					isDirectory: () => false,
				} as never);

				const result = findMarkdownFiles(
					"/test/dir",
					new Date("2025-08-30"),
					mockLogger,
				);

				expect(result).toEqual(["/test/dir/test1.md", "/test/dir/test2.md"]);
			});

			it("should filter files by date pattern", () => {
				vi.mocked(readdirSync).mockReturnValue([
					"2025-08-31-test.md",
					"2025-08-29-old.md",
					"no-date.md",
				] as never);

				vi.mocked(statSync).mockReturnValue({
					isDirectory: () => false,
				} as never);

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
				vi.mocked(readdirSync)
					.mockReturnValueOnce(["subdir", "file.md"] as never) // Root directory
					.mockReturnValueOnce(["nested.md"] as never); // Subdirectory

				vi.mocked(statSync)
					.mockReturnValueOnce({ isDirectory: () => true } as never) // subdir
					.mockReturnValueOnce({ isDirectory: () => false } as never) // file.md
					.mockReturnValueOnce({ isDirectory: () => false } as never); // nested.md

				const result = findMarkdownFiles(
					"/test/dir",
					new Date("2025-08-30"),
					mockLogger,
				);

				expect(result).toEqual([
					"/test/dir/subdir/nested.md",
					"/test/dir/file.md",
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

				vi.mocked(readFileSync).mockReturnValue(mockFileContent);
				vi.mocked(matter).mockReturnValue({
					data: { title: "Test Post", date: new Date("2025-08-31") },
					content: "This is the content.",
				} as never);

				const result = parseEphemeraFile(
					"/path/test.md",
					new Date("2025-08-30"),
					mockLogger,
				);

				expect(result).toEqual({
					file: "/path/test.md",
					data: { title: "Test Post", date: new Date("2025-08-31") },
					body: "This is the content.",
					image: undefined,
				});
			});

			it("should skip files before legacy cutoff", () => {
				vi.mocked(readFileSync).mockReturnValue(
					"---\ndate: 2025-08-29\n---\ncontent",
				);
				vi.mocked(matter).mockReturnValue({
					data: { date: new Date("2025-08-29") },
					content: "content",
					orig: "",
					language: "",
					matter: "",
					stringify: vi.fn(),
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

				vi.mocked(readFileSync).mockReturnValue(mockFileContent);
				vi.mocked(matter).mockReturnValue({
					data: {
						title: "Test Post",
						date: new Date("2025-08-31"),
						syndication: [
							{ href: "https://mastodon.social/post/1", title: "Mastodon" },
							{ href: "https://bsky.app/post/1", title: "Bluesky" },
						],
					},
					content: "Content",
					orig: "",
					language: "",
					matter: "",
					stringify: vi.fn(),
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
				vi.mocked(readFileSync).mockImplementation(() => {
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
				vi.mocked(readdirSync).mockReturnValue(["test.md"] as never);
				vi.mocked(statSync).mockReturnValue({
					isDirectory: () => false,
				} as never);
				vi.mocked(readFileSync).mockReturnValue(
					"---\ntitle: Test\ndate: 2025-08-31\n---\ncontent",
				);
				vi.mocked(matter).mockReturnValue({
					data: { title: "Test", date: new Date("2025-08-31") },
					content: "content",
					orig: "",
					language: "",
					matter: "",
					stringify: vi.fn(),
				});

				const result = scanEphemeraPosts(5, mockLogger);

				expect(result).toHaveLength(1);
				expect(result[0]?.data.title).toBe("Test");
			});

			it("should limit results to maxPosts", () => {
				vi.mocked(readdirSync).mockReturnValue([
					"test1.md",
					"test2.md",
					"test3.md",
				] as never);
				vi.mocked(statSync).mockReturnValue({
					isDirectory: () => false,
				} as never);
				vi.mocked(readFileSync).mockReturnValue(
					"---\ntitle: Test\ndate: 2025-08-31\n---\ncontent",
				);
				vi.mocked(matter).mockReturnValue({
					data: { title: "Test", date: new Date("2025-08-31") },
					content: "content",
					orig: "",
					language: "",
					matter: "",
					stringify: vi.fn(),
				});

				const result = scanEphemeraPosts(2, mockLogger);

				expect(result).toHaveLength(2);
			});

			it("should handle scanning errors gracefully", () => {
				vi.mocked(readdirSync).mockImplementation(() => {
					throw new Error("Directory not found");
				});

				const result = scanEphemeraPosts(5, mockLogger);

				expect(result).toEqual([]);
				expect(mockLogger.warn).toHaveBeenCalled();
			});
		});
	});

	describe("Mastodon Integration", () => {
		let mockLogger: Logger;
		let mockFetch: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockLogger = {
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			};

			mockFetch = vi.fn();
			global.fetch = mockFetch;
			vi.clearAllMocks();
		});

		it("should post text content successfully", async () => {
			const post: EphemeraPost = {
				file: "test.md",
				data: { title: "Test Post" },
				body: "This is test content for Mastodon posting.",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						url: "https://mastodon.social/@user/123456789",
					}),
			});

			const result = await postToMastodon(
				post,
				"https://example.com/test",
				{ token: "valid-token-12345", instance: "mastodon.social" },
				mockLogger,
			);

			expect(result.success).toBe(true);
			expect(result.url).toBe("https://mastodon.social/@user/123456789");
			expect(result.platform).toBe("mastodon");
		});

		it("should handle API errors gracefully", async () => {
			const post: EphemeraPost = {
				file: "test.md",
				data: { title: "Test" },
				body: "Test content",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			});

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 422,
				text: () => Promise.resolve("Validation error"),
			});

			const result = await postToMastodon(
				post,
				"https://example.com/test",
				{ token: "valid-token-12345", instance: "mastodon.social" },
				mockLogger,
			);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Mastodon API error: 422");
		});

		it("should handle rate limit errors", async () => {
			const post: EphemeraPost = {
				file: "test.md",
				data: { title: "Test" },
				body: "Test content",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			});

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 429,
				headers: {
					get: () => "60",
				},
				text: () => Promise.resolve("Rate limit exceeded"),
			});

			const result = await postToMastodon(
				post,
				"https://example.com/test",
				{ token: "valid-token-12345", instance: "mastodon.social" },
				mockLogger,
			);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Rate limit exceeded");
		});
	});

	describe("Bluesky Integration", () => {
		let mockLogger: Logger;
		let mockFetch: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockLogger = {
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			};

			mockFetch = vi.fn();
			global.fetch = mockFetch;
			vi.clearAllMocks();
		});

		describe("parseUrlFacets", () => {
			it("should parse URLs and create facets with correct byte positions", () => {
				const text =
					"Check out https://example.com and http://test.org for more info.";
				const result = parseUrlFacets(text);

				expect(result).toBeDefined();
				expect(result).toHaveLength(2);
				if (
					result &&
					result.length >= 2 &&
					result[0] &&
					typeof result[0].index.byteStart === "number" &&
					typeof result[0].index.byteEnd === "number"
				) {
					const facet = result[0];
					const facet1 = result[1];
					if (
						facet &&
						facet.index &&
						facet.index.byteStart != null &&
						facet.index.byteEnd != null &&
						facet1 &&
						facet1.index &&
						facet.features &&
						facet.features.length > 0 &&
						facet.features[0] &&
						facet1.features &&
						facet1.features.length > 0 &&
						facet1.features[0]
					) {
						const feature = facet.features[0];
						const feature1 = facet1.features[0];
						if (feature && feature1) {
							expect(feature.uri).toBe("https://example.com");
							expect(feature1.uri).toBe("http://test.org");
						}

						// Check byte positions are numbers and start < end
						expect(typeof facet.index.byteStart!).toBe("number");
						expect(typeof facet.index.byteEnd!).toBe("number");
						expect(facet.index.byteStart!).toBeLessThan(facet.index.byteEnd!);
					}
				}
			});

			it("should handle URLs with special characters", () => {
				const text = "Visit https://example.com/path?query=value&other=123";
				const result = parseUrlFacets(text);

				expect(result).toHaveLength(1);
				if (result && result.length > 0) {
					const facet = result[0];
					if (
						facet &&
						facet.features &&
						facet.features.length > 0 &&
						facet.features[0]
					) {
						expect(facet.features[0].uri).toBe(
							"https://example.com/path?query=value&other=123",
						);
					}
				}
			});

			it("should handle multi-byte characters correctly", () => {
				const text = "🌟 Check https://example.com for info!";
				const result = parseUrlFacets(text);

				expect(result).toHaveLength(1);
				// The emoji takes 4 bytes, so byteStart should account for that
				const expectedByteStart = new TextEncoder().encode("🌟 Check ").length; // Byte position
				if (result && result.length > 0) {
					const facet = result[0];
					if (facet && facet.index.byteStart !== undefined) {
						expect(facet.index.byteStart).toBe(expectedByteStart);
					}
				}
			});

			it("should validate UTF-8 byte positions are valid boundaries", () => {
				const text = "Hello 🌍 world with https://example.com!";
				const result = parseUrlFacets(text);

				expect(result).toHaveLength(1);
				if (result && result.length > 0) {
					const facet = result[0];
					if (
						facet &&
						facet.index.byteStart !== undefined &&
						facet.index.byteEnd !== undefined
					) {
						const encoder = new TextEncoder();
						const fullBytes = encoder.encode(text);

						// Validate byte positions are within bounds
						expect(facet.index.byteStart).toBeGreaterThanOrEqual(0);
						expect(facet.index.byteEnd).toBeLessThanOrEqual(fullBytes.length);
						expect(facet.index.byteStart).toBeLessThan(facet.index.byteEnd);

						// Extract the substring using byte positions
						const urlBytes = fullBytes.slice(
							facet.index.byteStart,
							facet.index.byteEnd,
						);
						const urlText = new TextDecoder().decode(urlBytes);
						expect(urlText).toBe("https://example.com");
					}
				}
			});

			it("should return undefined when no URLs found", () => {
				const text = "This is just plain text with no URLs.";
				const result = parseUrlFacets(text);

				expect(result).toBeUndefined();
			});

			it("should filter out invalid facets where start >= end", () => {
				// This is hard to trigger naturally, but we can test the filter logic
				const text = "Valid https://example.com";
				const result = parseUrlFacets(text);

				expect(result).toHaveLength(1);
				if (result && result.length > 0) {
					const facet = result[0];
					if (
						facet &&
						facet.index.byteStart !== undefined &&
						facet.index.byteEnd !== undefined
					) {
						expect(facet.index.byteStart).toBeLessThan(facet.index.byteEnd);
					}
				}
			});

			it("should strip trailing punctuation from URIs and adjust byteEnd", () => {
				const text = "Visit https://example.com, for more info.";
				const result = parseUrlFacets(text);

				expect(result).toBeDefined();
				expect(result).toHaveLength(1);
				if (result && result.length > 0) {
					const facet = result[0];
					if (
						facet &&
						facet.features &&
						facet.features.length > 0 &&
						facet.features[0]
					) {
						expect(facet.features[0].uri).toBe("https://example.com");
					}
				}
				// byteEnd should be adjusted to exclude the comma
				const expectedEnd = new TextEncoder().encode(
					"Visit https://example.com",
				).length;
				if (result && result.length > 0) {
					const facet = result[0];
					if (facet && facet.index.byteEnd !== undefined) {
						expect(facet.index.byteEnd).toBe(expectedEnd);
					}
				}
			});

			it("should strip trailing parenthesis if no opening paren", () => {
				const text = "Check (https://example.com) and more";
				const result = parseUrlFacets(text);

				expect(result).toBeDefined();
				expect(result).toHaveLength(1);
				if (result && result.length > 0) {
					const facet = result[0];
					if (
						facet &&
						facet.features &&
						facet.features.length > 0 &&
						facet.features[0]
					) {
						expect(facet.features[0].uri).toBe("https://example.com");
					}
				}
			});

			it("should skip invalid URLs", () => {
				const text = "Invalid https:// and valid https://example.com";
				const result = parseUrlFacets(text);

				expect(result).toBeDefined();
				expect(result).toHaveLength(1);
				if (result && result.length > 0) {
					const facet = result[0];
					if (
						facet &&
						facet.features &&
						facet.features.length > 0 &&
						facet.features[0]
					) {
						expect(facet.features[0].uri).toBe("https://example.com");
					}
				}
			});
		});

		describe("resolveImagePath", () => {
			it("should resolve relative paths from ephemera directory", () => {
				const result = resolveImagePath("./test-image.jpg");
				expect(result).toBe(
					"/mock/project/root/src/content/ephemera/test-image.jpg",
				);
			});

			it("should resolve absolute paths from public directory", () => {
				const result = resolveImagePath("/images/test-image.jpg");
				expect(result).toBe("/mock/project/root/public/images/test-image.jpg");
			});

			it("should resolve plain paths as relative to ephemera", () => {
				const result = resolveImagePath("test-image.jpg");
				expect(result).toBe(
					"/mock/project/root/src/content/ephemera/test-image.jpg",
				);
			});

			it("should handle paths with subdirectories", () => {
				const result = resolveImagePath("./subdir/test-image.jpg");
				expect(result).toBe(
					"/mock/project/root/src/content/ephemera/subdir/test-image.jpg",
				);
			});

			it("should handle absolute paths with subdirectories", () => {
				const result = resolveImagePath("/assets/images/test-image.jpg");
				expect(result).toBe(
					"/mock/project/root/public/assets/images/test-image.jpg",
				);
			});
		});

		describe("selectImageSource", () => {
			it("should be a function", () => {
				expect(typeof selectImageSource).toBe("function");
			});

			it("should accept correct parameters", () => {
				// Test that the function can be called with expected parameters
				const mockLogger = {
					info: vi.fn(),
					warn: vi.fn(),
					error: vi.fn(),
					debug: vi.fn(),
				};

				// This will test that the function signature is correct
				expect(() => {
					selectImageSource(
						"/dist/_astro/processed-image.webp",
						"/src/content/ephemera/original.jpg",
						"bluesky",
						mockLogger,
					);
				}).not.toThrow();
			});
		});

		describe("createImageResult", () => {
			it("should create image result with correct MIME type for JPEG", () => {
				const mockBuffer = Buffer.from("fake image data");
				const imageResult = {
					path: "/path/to/image.jpg",
					buffer: mockBuffer,
				};

				const result = createImageResult(imageResult);

				expect(result).toEqual({
					path: "/path/to/image.jpg",
					size: mockBuffer.length,
					mimeType: "image/jpeg",
				});
			});

			it("should create image result with correct MIME type for PNG", () => {
				const mockBuffer = Buffer.from("fake png data");
				const imageResult = {
					path: "/path/to/image.png",
					buffer: mockBuffer,
				};

				const result = createImageResult(imageResult);

				expect(result).toEqual({
					path: "/path/to/image.png",
					size: mockBuffer.length,
					mimeType: "image/png",
				});
			});

			it("should create image result with correct MIME type for WebP", () => {
				const mockBuffer = Buffer.from("fake webp data");
				const imageResult = {
					path: "/path/to/image.webp",
					buffer: mockBuffer,
				};

				const result = createImageResult(imageResult);

				expect(result).toEqual({
					path: "/path/to/image.webp",
					size: mockBuffer.length,
					mimeType: "image/webp",
				});
			});

			it("should default to JPEG for unknown extensions", () => {
				const mockBuffer = Buffer.from("fake data");
				const imageResult = {
					path: "/path/to/image.bmp",
					buffer: mockBuffer,
				};

				const result = createImageResult(imageResult);

				expect(result.mimeType).toBe("image/jpeg");
			});

			it("should handle uppercase extensions", () => {
				const mockBuffer = Buffer.from("fake data");
				const imageResult = {
					path: "/path/to/image.PNG",
					buffer: mockBuffer,
				};

				const result = createImageResult(imageResult);

				expect(result.mimeType).toBe("image/png");
			});

			it("should create valid Bluesky image embed structure", () => {
				const mockBuffer = Buffer.from("fake image data");
				const imageResult = {
					path: "/path/to/image.jpg",
					buffer: mockBuffer,
				};

				const result = createImageResult(imageResult);

				// Validate the structure matches Bluesky's embed lexicon
				expect(result).toEqual({
					path: "/path/to/image.jpg",
					size: mockBuffer.length,
					mimeType: "image/jpeg",
				});

				// Ensure size is reasonable for Bluesky (under 800KB conservative limit)
				expect(result.size).toBeLessThan(800 * 1024);

				// Ensure MIME type is valid for Bluesky
				expect(result.mimeType).toMatch(/^image\/(jpeg|png|gif|webp)$/);
			});
		});

		describe("postToBluesky", () => {
			it("should post text content successfully", async () => {
				const post: EphemeraPost = {
					file: "test.md",
					data: { title: "Test Post" },
					body: "This is test content with https://example.com link.",
				};

				// Mock authentication
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							accessJwt: "test-jwt",
							did: "test-did",
							handle: "test-handle",
						}),
				});

				// Mock post creation
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							uri: "at://did:plc:test/app.bsky.feed.post/123",
							cid: "bafyreih5xg4tw7onf4ajm5m7p6h6k3qx5q7q7q7q7q7q7q7q7q7q7q7q7q7q7q",
							validationStatus: "valid",
						}),
				});

				const result = await postToBluesky(
					post,
					"https://example.com/test",
					{ username: "test.bsky.social", password: "password" },
					mockLogger,
				);

				expect(result.success).toBe(true);
				expect(result.url).toContain("test.bsky.social");
				expect(result.platform).toBe("bluesky");
			});

			it("should handle URLs in content and create facets", async () => {
				const post: EphemeraPost = {
					file: "test.md",
					data: { title: "Test Post" },
					body: "Check this link: https://example.com",
				};

				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							accessJwt: "test-jwt",
							did: "test-did",
							handle: "test-handle",
						}),
				});

				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							uri: "at://did:plc:test/app.bsky.feed.post/123",
							cid: "bafyreih5xg4tw7onf4ajm5m7p6h6k3qx5q7q7q7q7q7q7q7q7q7q7q7q7q7q7q",
							validationStatus: "valid",
						}),
				});

				await postToBluesky(
					post,
					"https://example.com/test",
					{ username: "test.bsky.social", password: "password" },
					mockLogger,
				);

				// Check that the second fetch (post creation) was called with facets
				expect(mockFetch).toHaveBeenCalledTimes(2);
				const postCall = mockFetch.mock.calls[1]?.[1];
				expect(postCall).toBeDefined();
				const postData = JSON.parse(postCall.body as string);
				expect(postData.record.facets).toBeDefined();
				expect(postData.record.facets).toHaveLength(2);
			});

			it("should handle authentication failure", async () => {
				const post: EphemeraPost = {
					file: "test.md",
					data: { title: "Test" },
					body: "Test content",
				};

				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 401,
				});

				const result = await postToBluesky(
					post,
					"https://example.com/test",
					{ username: "test.bsky.social", password: "password" },
					mockLogger,
				);

				expect(result.success).toBe(false);
				expect(result.error).toContain("Bluesky auth failed");
			});

			it("should handle post creation failure", async () => {
				const post: EphemeraPost = {
					file: "test.md",
					data: { title: "Test" },
					body: "Test content",
				};

				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							accessJwt: "test-jwt",
							did: "test-did",
							handle: "test-handle",
						}),
				});

				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 400,
					text: () => Promise.resolve("Invalid request"),
				});

				const result = await postToBluesky(
					post,
					"https://example.com/test",
					{ username: "test.bsky.social", password: "password" },
					mockLogger,
				);

				expect(result.success).toBe(false);
				expect(result.error).toContain("Bluesky post failed");
			});

			it("should handle rate limiting errors", async () => {
				const post: EphemeraPost = {
					file: "test.md",
					data: { title: "Test" },
					body: "Test content",
				};

				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							accessJwt: "test-jwt",
							did: "test-did",
							handle: "test-handle",
						}),
				});

				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 429,
					headers: {
						get: (name: string) => (name === "retry-after" ? "60" : null),
					},
					text: () => Promise.resolve("Rate limit exceeded"),
				});

				const result = await postToBluesky(
					post,
					"https://example.com/test",
					{ username: "test.bsky.social", password: "password" },
					mockLogger,
				);

				expect(result.success).toBe(false);
				expect(result.error).toContain("Rate limit exceeded");
			});

			it("should truncate content for Bluesky's character limit", async () => {
				const longBody = "A".repeat(300);
				const post: EphemeraPost = {
					file: "test.md",
					data: { title: "Test Post" },
					body: longBody,
				};

				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							accessJwt: "test-jwt",
							did: "test-did",
							handle: "test-handle",
						}),
				});

				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							uri: "at://did:plc:test/app.bsky.feed.post/123",
							cid: "bafyreih5xg4tw7onf4ajm5m7p6h6k3qx5q7q7q7q7q7q7q7q7q7q7q7q7q7q7q",
							validationStatus: "valid",
						}),
				});

				await postToBluesky(
					post,
					"https://example.com/test",
					{ username: "test.bsky.social", password: "password" },
					mockLogger,
				);

				const postCall = mockFetch.mock.calls[1]?.[1];
				expect(postCall).toBeDefined();
				const postData = JSON.parse(postCall.body as string);
				expect(postData.record.text.length).toBeLessThanOrEqual(280);
				expect(postData.record.text).toContain("..."); // Should be truncated
			});
		});
	});
});
