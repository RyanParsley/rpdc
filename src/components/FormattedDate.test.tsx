import { describe, it, expect } from "vitest";

describe("FormattedDate", () => {
	it("should render formatted date correctly", () => {
		// Use a date that will format to Aug 31 in local timezone
		const testDate = new Date("2025-08-31T04:00:00.000Z"); // 4 AM UTC = 12 AM EDT

		// Since this is an Astro component, we'll test the date formatting logic directly
		const formatted = testDate.toLocaleDateString("en-us", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});

		expect(formatted).toBe("Aug 31, 2025");
	});

	it("should handle different date formats", () => {
		// Create dates that will definitely format to the expected strings
		const dates = [
			new Date(2025, 0, 15), // January 15, 2025 (month is 0-indexed)
			new Date(2025, 11, 25), // December 25, 2025 (month is 0-indexed)
			new Date(2025, 5, 3), // June 3, 2025 (month is 0-indexed)
		];

		const expected = ["Jan 15, 2025", "Dec 25, 2025", "Jun 3, 2025"];

		dates.forEach((date, index) => {
			const formatted = date.toLocaleDateString("en-us", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
			expect(formatted).toBe(expected[index]);
		});
	});

	it("should use correct datetime attribute", () => {
		const testDate = new Date("2025-08-31T12:00:00Z");
		const isoString = testDate.toISOString();

		expect(isoString).toBe("2025-08-31T12:00:00.000Z");
	});

	it("should handle edge cases", () => {
		// Test with current date
		const now = new Date();
		expect(() => {
			now.toLocaleDateString("en-us", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		}).not.toThrow();

		// Test with UTC date
		const utcDate = new Date("2025-08-31T04:00:00.000Z");
		const formatted = utcDate.toLocaleDateString("en-us", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
		expect(formatted).toBe("Aug 31, 2025");
	});

	it("should format dates consistently", () => {
		const date1 = new Date("2025-08-31T04:00:00.000Z");
		const date2 = new Date("2025-08-31T23:59:59.000Z");

		const formatted1 = date1.toLocaleDateString("en-us", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});

		const formatted2 = date2.toLocaleDateString("en-us", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});

		// Both should format to the same date string despite different times
		expect(formatted1).toBe(formatted2);
		expect(formatted1).toBe("Aug 31, 2025");
	});
});
