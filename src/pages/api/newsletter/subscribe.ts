import type { APIRoute } from "astro";
import { subscribeToNewsletter } from "../../../utils/buttondown";

// Disable prerendering for this API route since it makes external API calls
export const prerender = false;

// Type for the expected request body
interface NewsletterRequestBody {
	email_address: string;
	referrer_url?: string;
	[key: string]: unknown; // Allow additional properties
}

// Type for API response data
type ApiResponseData = Record<string, unknown> | { error: string };

// Pure function for email validation
const validateEmail = (email: string): boolean => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

// Pure function to create subscriber data with UTM tracking
const createSubscriberData = (body: NewsletterRequestBody, referrer?: string) =>
	({
		...body,
		utm_source: "website",
		utm_medium: "newsletter_signup",
		referrer_url: body.referrer_url || referrer || "",
	}) as const;

// Pure function to handle API errors
const handleApiError = (
	error: unknown,
): { message: string; statusCode: number } => {
	if (!(error instanceof Error)) {
		return { message: "An unexpected error occurred", statusCode: 500 };
	}

	const errorMessage = error.message;

	// Handle specific error cases with appropriate status codes
	if (errorMessage.includes("already subscribed")) {
		return { message: errorMessage, statusCode: 409 };
	}

	if (errorMessage.includes("API key not configured")) {
		return {
			message: "Newsletter service is not properly configured",
			statusCode: 500,
		};
	}

	if (errorMessage.includes("Invalid API key")) {
		return { message: errorMessage, statusCode: 500 };
	}

	return { message: errorMessage, statusCode: 400 };
};

// Pure function to create JSON response
const createJsonResponse = (data: ApiResponseData, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});

export const POST: APIRoute = async ({ request }) => {
	try {
		// Parse and validate request body
		const body = (await request.json()) as NewsletterRequestBody;

		// Validate required fields using functional approach
		if (!body.email_address || typeof body.email_address !== "string") {
			return createJsonResponse(
				{ error: "Email address is required and must be a string" },
				400,
			);
		}

		// Validate email format
		if (!validateEmail(body.email_address)) {
			return createJsonResponse(
				{ error: "Please enter a valid email address" },
				400,
			);
		}

		// Create subscriber data with UTM tracking
		const subscriberData = createSubscriberData(
			body,
			request.headers.get("referer") || undefined,
		);

		// Make API call using functional approach
		const result = await subscribeToNewsletter(subscriberData);

		if (!result.success) {
			const { message, statusCode } = handleApiError(
				new Error(result.error.detail),
			);
			return createJsonResponse({ error: message }, statusCode);
		}

		// Success response
		return createJsonResponse({
			success: true,
			message: "Successfully subscribed!",
			subscriber: result.data,
		});
	} catch (error) {
		console.error("Newsletter subscription error:", error);
		const { message, statusCode } = handleApiError(error);
		return createJsonResponse({ error: message }, statusCode);
	}
};
