import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/setup";
import { subscribeToNewsletter } from "./buttondown";

describe("buttondown.ts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("BUTTONDOWN_API_KEY", "test-api-key");
		server.resetHandlers();
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

			server.use(
				http.post("https://api.buttondown.com/v1/subscribers", () => {
					return HttpResponse.json(subscriberData, { status: 200 });
				}),
			);

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
			server.use(
				http.post("https://api.buttondown.com/v1/subscribers", () => {
					return HttpResponse.json(
						{ detail: "Invalid email format", code: "email_invalid" },
						{ status: 400 },
					);
				}),
			);

			const result = await subscribeToNewsletter({
				email_address: "invalid",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.detail).toBe("Invalid email format");
			}
		});

		it("handles network errors gracefully", async () => {
			server.use(
				http.post("https://api.buttondown.com/v1/subscribers", () => {
					return HttpResponse.error();
				}),
			);

			const result = await subscribeToNewsletter({
				email_address: "test@example.com",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.detail).toBeTruthy();
			}
		});
	});
});
