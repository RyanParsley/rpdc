import { describe, it, expect, vi, beforeEach } from "vitest";
import { subscribeToNewsletter } from "./buttondown";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("buttondown.ts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("BUTTONDOWN_API_KEY", "test-api-key");
	});

	describe("subscribeToNewsletter", () => {
		it("returns success with subscriber data on valid response", async () => {
			const subscriberData = {
				id: "sub_123",
				email_address: "test@example.com",
				creation_date: "2025-01-01T00:00:00Z",
				tags: [] as string[],
				type: "regular",
				source: "api",
			};

			const mockResponse = new Response(JSON.stringify(subscriberData), {
				status: 200,
				statusText: "OK",
			});
			mockFetch.mockResolvedValue(mockResponse);

			const result = await subscribeToNewsletter({
				email_address: "test@example.com",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email_address).toBe("test@example.com");
			}
		});

		it("returns error when API key is missing", async () => {
			vi.stubEnv("BUTTONDOWN_API_KEY", "");

			const result = await subscribeToNewsletter({
				email_address: "test@example.com",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.detail).toBe("Buttondown API key not configured");
			}
		});

		it("returns error on HTTP error response", async () => {
			const mockResponse = new Response(
				JSON.stringify({
					detail: "Invalid email format",
					code: "email_invalid",
				}),
				{ status: 400, statusText: "Bad Request" },
			);
			mockFetch.mockResolvedValue(mockResponse);

			const result = await subscribeToNewsletter({
				email_address: "invalid",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.detail).toBe("Invalid email format");
			}
		});

		it("handles network errors gracefully", async () => {
			mockFetch.mockRejectedValue(new Error("Network timeout"));

			const result = await subscribeToNewsletter({
				email_address: "test@example.com",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe("NETWORK_ERROR");
			}
		});
	});
});
