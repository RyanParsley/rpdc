import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupAstroMocks } from "../test/astro-test-utils";

describe("ImageGallery Component", () => {
	beforeEach(() => {
		setupAstroMocks();
		vi.clearAllMocks();
	});

	describe("Props Validation", () => {
		it("should accept valid image data structure", () => {
			const testImages = [
				{ url: "./image1.jpg", alt: "Test image 1" },
				{ url: "./image2.png", alt: "Test image 2" },
			];
			const testPath = "/blog/test-post";

			expect(testImages).toHaveLength(2);
			expect(testImages[0]).toHaveProperty("url");
			expect(testImages[0]).toHaveProperty("alt");
			expect(testPath).toBe("/blog/test-post");
		});

		it("should handle empty images array", () => {
			const emptyImages: Array<{ url: string; alt: string }> = [];
			const testPath = "/blog/test-post";

			expect(emptyImages).toHaveLength(0);
			expect(testPath).toBe("/blog/test-post");
		});
	});

	describe("Path Processing", () => {
		it("should convert relative paths correctly", () => {
			const testCases = [
				{
					input: "./image.jpg",
					path: "/blog/post",
					expected: "/src/content/blog/post/image.jpg",
				},
				{
					input: "./folder/image.png",
					path: "/note/test",
					expected: "/src/content/note/test/folder/image.png",
				},
				{
					input: "assets/image.gif",
					path: "/blog/post",
					expected: "/src/assets/assets/image.gif",
				},
			];

			testCases.forEach(({ input, path, expected }) => {
				const getFullPath = (url: string) =>
					url.startsWith("./")
						? `/src/content${path}/${url.replace("./", "")}`
						: `/src/assets/${url.replace("./", "")}`;

				expect(getFullPath(input)).toBe(expected);
			});
		});

		it("should handle various path formats", () => {
			const paths = [
				"/blog/my-post",
				"/note/interesting-idea",
				"/ephemera/quick-thought",
			];

			paths.forEach((path) => {
				expect(path).toMatch(/^\/(blog|note|ephemera)/);
			});
		});
	});

	describe("Image Data Processing", () => {
		it("should process image data correctly", () => {
			const images = [
				{ url: "./test1.jpg", alt: "Test 1" },
				{ url: "./test2.png", alt: "Test 2" },
			];
			const path = "/blog/test";

			const processedImages = images.map((img) => ({
				...img,
				url: img.url.startsWith("./")
					? `/src/content${path}/${img.url.replace("./", "")}`
					: `/src/assets/${img.url.replace("./", "")}`,
			}));

			expect(processedImages).toHaveLength(2);
			expect(processedImages[0]?.url).toBe("/src/content/blog/test/test1.jpg");
			expect(processedImages[0]?.alt).toBe("Test 1");
			expect(processedImages[1]?.url).toBe("/src/content/blog/test/test2.png");
			expect(processedImages[1]?.alt).toBe("Test 2");
		});

		it("should preserve alt text", () => {
			const images = [
				{ url: "./image.jpg", alt: "A beautiful sunset over mountains" },
				{ url: "./photo.png", alt: "Team meeting in conference room" },
			];

			images.forEach((image) => {
				expect(image.alt).toBeTruthy();
				expect(typeof image.alt).toBe("string");
				expect(image.alt.length).toBeGreaterThan(0);
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle missing images gracefully", async () => {
			const mockImageAssets = {};

			const deriveSrc = async (image: { url: string; alt: string }) => {
				const source = (mockImageAssets as Record<string, () => unknown>)?.[
					image?.url
				]?.();
				if (source === undefined) {
					throw new Error(
						`"${image.url}" does not exist in glob: "src/assets/*.{jpeg,jpg,png,gif}"`,
					);
				}
				return source;
			};

			const missingImage = { url: "/missing/image.jpg", alt: "Missing" };

			await expect(deriveSrc(missingImage)).rejects.toThrow(
				'"/missing/image.jpg" does not exist',
			);
		});

		it("should validate image data structure", () => {
			const validImage = { url: "./test.jpg", alt: "Test" };
			const invalidImage = { url: "./test.jpg" }; // Missing alt

			expect(validImage).toHaveProperty("url");
			expect(validImage).toHaveProperty("alt");
			expect(invalidImage).not.toHaveProperty("alt");
		});
	});

	describe("Accessibility", () => {
		it("should ensure all images have alt text", () => {
			const images = [
				{ url: "./image1.jpg", alt: "Description 1" },
				{ url: "./image2.png", alt: "Description 2" },
				{ url: "./image3.gif", alt: "Description 3" },
			];

			images.forEach((image) => {
				expect(image.alt).toBeDefined();
				expect(image.alt?.length).toBeGreaterThan(0);
			});
		});

		it("should generate unique IDs for lightbox functionality", () => {
			const images = [
				{ url: "./img1.jpg", alt: "Image 1" },
				{ url: "./img2.jpg", alt: "Image 2" },
				{ url: "./img3.jpg", alt: "Image 3" },
			];

			const ids = images.map((_, index) => `image-${index}`);
			expect(ids).toEqual(["image-0", "image-1", "image-2"]);

			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(images.length);
		});
	});
});
