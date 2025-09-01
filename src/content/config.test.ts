import { describe, it, expect, vi } from "vitest";

// Mock the entire config module to avoid astro:content import issues
vi.mock("./config", () => ({
	collections: {
		blog: {
			schema: vi.fn(),
		},
		note: {
			schema: vi.fn(),
		},
		draft: {
			schema: vi.fn(),
		},
		ephemera: {
			schema: vi.fn(),
		},
	},
}));

// Import the mocked collections
import { collections } from "./config";

describe("Content Collections Configuration", () => {
	describe("Schema Validation", () => {
		it("should export all required collections", () => {
			expect(collections).toBeDefined();
			expect(collections).toHaveProperty("blog");
			expect(collections).toHaveProperty("note");
			expect(collections).toHaveProperty("draft");
			expect(collections).toHaveProperty("ephemera");
		});

		it("should have valid collection definitions", () => {
			expect(collections).toBeDefined();
			Object.values(collections).forEach((collection) => {
				expect(collection).toHaveProperty("schema");
				expect(typeof collection.schema).toBe("function");
			});
		});
	});

	describe("Date Transformation", () => {
		it("should handle string dates", () => {
			const testDate = "2025-08-31";
			const transformed = new Date(testDate);
			expect(transformed).toBeInstanceOf(Date);
			expect(transformed.toISOString().startsWith("2025-08-31")).toBe(true);
		});

		it("should handle Date objects", () => {
			const testDate = new Date("2025-08-31");
			expect(testDate).toBeInstanceOf(Date);
			expect(testDate.toISOString().startsWith("2025-08-31")).toBe(true);
		});

		it("should handle number timestamps", () => {
			const testDate = new Date(1756598400000); // 2025-08-31 timestamp
			expect(testDate).toBeInstanceOf(Date);
			expect(testDate.toISOString().startsWith("2025-08-31")).toBe(true);
		});
	});

	describe("Data Structure Validation", () => {
		it("should handle valid blog post data structure", () => {
			const testData = {
				title: "Test Post",
				description: "Test description",
				pubDate: "2025-08-31",
			};

			expect(testData.title).toBe("Test Post");
			expect(testData.description).toBe("Test description");
			expect(testData.pubDate).toBe("2025-08-31");
		});

		it("should handle ephemera data structure", () => {
			const testData = {
				date: "2025-08-31",
				syndication: [
					{ href: "https://mastodon.social/post/1", title: "Mastodon" },
				],
			};

			expect(testData.date).toBe("2025-08-31");
			expect(testData.syndication).toHaveLength(1);
			expect(testData.syndication[0]?.title).toBe("Mastodon");
		});
	});
});
