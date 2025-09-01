import { describe, it, expect } from "vitest";
import { SITE_TITLE, SITE_DESCRIPTION } from "./consts";

describe("Constants", () => {
	describe("SITE_TITLE", () => {
		it("should be defined", () => {
			expect(SITE_TITLE).toBeDefined();
		});

		it("should be a string", () => {
			expect(typeof SITE_TITLE).toBe("string");
		});

		it("should have the expected value", () => {
			expect(SITE_TITLE).toBe("RyanParsleyDotCom");
		});

		it("should not be empty", () => {
			expect(SITE_TITLE.length).toBeGreaterThan(0);
		});
	});

	describe("SITE_DESCRIPTION", () => {
		it("should be defined", () => {
			expect(SITE_DESCRIPTION).toBeDefined();
		});

		it("should be a string", () => {
			expect(typeof SITE_DESCRIPTION).toBe("string");
		});

		it("should have the expected value", () => {
			expect(SITE_DESCRIPTION).toBe(
				"A software developer that is curious about quality.",
			);
		});

		it("should not be empty", () => {
			expect(SITE_DESCRIPTION.length).toBeGreaterThan(0);
		});

		it("should be a reasonable length for SEO", () => {
			expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
		});
	});
});
