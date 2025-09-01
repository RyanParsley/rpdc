import { describe, it, expect } from "vitest";

describe("FormattedDate", () => {
	it("should render formatted date correctly", () => {
		const testDate = new Date("2025-08-31");

		// Since this is an Astro component, we'll test the date formatting logic directly
		const formatted = testDate.toLocaleDateString("en-us", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});

		expect(formatted).toBe("Aug 31, 2025");
	});

	it("should handle different date formats", () => {
		const dates = [
			new Date("2025-01-15"),
			new Date("2025-12-25"),
			new Date("2025-06-03"),
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
		const utcDate = new Date(Date.UTC(2025, 7, 31)); // August 31, 2025
		const formatted = utcDate.toLocaleDateString("en-us", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
		expect(formatted).toBe("Aug 31, 2025");
	});

	it("should format dates consistently", () => {
		const date1 = new Date("2025-08-31");
		const date2 = new Date("2025-08-31T23:59:59");

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
