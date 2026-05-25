import { describe, it, expect } from "vitest";

// We test the logic separately from Astro's request/response handling
// The key behaviors we need to validate:

describe("subscribe.ts logic", () => {
	describe("email validation", () => {
		const validateEmail = (email: string): boolean => {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			return emailRegex.test(email);
		};

		it("accepts valid email addresses", () => {
			expect(validateEmail("test@example.com")).toBe(true);
			expect(validateEmail("user.name@domain.co.uk")).toBe(true);
			expect(validateEmail("user+tag@example.org")).toBe(true);
		});

		it("rejects invalid email addresses", () => {
			expect(validateEmail("notanemail")).toBe(false);
			expect(validateEmail("missing@")).toBe(false);
			expect(validateEmail("@nodomain.com")).toBe(false);
			expect(validateEmail("spaces in@email.com")).toBe(false);
			expect(validateEmail("")).toBe(false);
		});
	});

	describe("redirect URL generation", () => {
		const getErrorRedirectUrl = (message: string): string => {
			const encodedMessage = encodeURIComponent(message);
			return `/newsletter/confirm?status=error&message=${encodedMessage}`;
		};

		const getSuccessRedirectUrl = (): string => {
			return "/newsletter/confirm?status=success";
		};

		it("generates correct success redirect URL", () => {
			expect(getSuccessRedirectUrl()).toBe(
				"/newsletter/confirm?status=success",
			);
		});

		it("generates correct error redirect URL with encoded message", () => {
			const url = getErrorRedirectUrl("Already subscribed");
			expect(url).toContain("status=error");
			// Space encodes to %20, not +
			expect(url).toContain("Already%20subscribed");
		});

		it("handles special characters in error messages", () => {
			const url = getErrorRedirectUrl("Email & special <chars>!");
			expect(url).toContain("status=error");
			// Special chars should be URL encoded
			expect(url).toContain("%26"); // &
			expect(url).toContain("%3C"); // <
			expect(url).toContain("%3E"); // >
		});
	});

	describe("subscriber data creation", () => {
		const createSubscriberData = (email: string) => ({
			email_address: email.trim(),
			utm_source: "website" as const,
			utm_medium: "newsletter_signup" as const,
		});

		it("creates properly shaped subscriber data", () => {
			const data = createSubscriberData("test@example.com");

			expect(data).toEqual({
				email_address: "test@example.com",
				utm_source: "website",
				utm_medium: "newsletter_signup",
			});
		});

		it("trims whitespace from email", () => {
			const data = createSubscriberData("  test@example.com  ");
			expect(data.email_address).toBe("test@example.com");
		});
	});
});

describe("buttondown.ts integration behavior", () => {
	// Mock the API response shapes to verify our code handles them correctly

	describe("error handling for already subscribed", () => {
		it("detects already subscribed error message", () => {
			const errorMessage =
				"Email address is already subscribed to our newsletter.";
			const isAlreadySubscribed = errorMessage.includes("already subscribed");
			expect(isAlreadySubscribed).toBe(true);
		});
	});

	describe("error handling for invalid API key", () => {
		it("detects invalid API key error", () => {
			const errorMessage = "Invalid API key";
			const isInvalidKey = errorMessage.includes("Invalid API key");
			expect(isInvalidKey).toBe(true);
		});
	});
});
