/**
 * Buttondown API integration utilities
 * Handles newsletter subscription management with functional programming patterns
 */

// Configuration with const assertion for immutability
const BUTTONDOWN_CONFIG = {
	baseUrl: "https://api.buttondown.com/v1",
	apiKey: import.meta.env.BUTTONDOWN_API_KEY,
	version: "v1",
} as const;

// More specific types for better type safety
export interface SubscriberMetadata {
	[key: string]: string | number | boolean;
}

export interface SubscriberInput {
	readonly email_address: string;
	readonly notes?: string;
	readonly metadata?: SubscriberMetadata;
	readonly tags?: readonly string[];
	readonly referrer_url?: string;
	readonly utm_campaign?: string;
	readonly utm_medium?: string;
	readonly utm_source?: string;
}

export interface SubscriberResponse {
	readonly id: string;
	readonly creation_date: string;
	readonly email_address: string;
	readonly notes?: string;
	readonly metadata?: SubscriberMetadata;
	readonly tags: readonly string[];
	readonly type: string;
	readonly source: string;
}

export interface ButtondownError {
	readonly code?: string;
	readonly detail: string;
	readonly metadata?: Record<string, string>;
}

// Discriminated union for better error handling
export type ButtondownResult<T> =
	| { success: true; data: T }
	| { success: false; error: ButtondownError };

// Pure function to create API headers
const createApiHeaders = (apiKey: string) =>
	({
		Authorization: `Token ${apiKey}`,
		"Content-Type": "application/json",
		"User-Agent": "RyanParsleyDotCom/1.0",
	}) as const;

// Pure function to validate API key
const validateApiKey = (apiKey?: string): apiKey is string => {
	return Boolean(apiKey && apiKey.trim().length > 0);
};

// Pure function to handle HTTP responses
const handleApiResponse = async <T>(
	response: Response,
	successParser: (data: unknown) => T,
): Promise<ButtondownResult<T>> => {
	try {
		const responseText = await response.text();

		if (!response.ok) {
			let errorData: ButtondownError;
			try {
				errorData = JSON.parse(responseText);
			} catch {
				errorData = {
					detail: `HTTP ${response.status}: ${response.statusText}`,
					metadata: { responseBody: responseText },
				};
			}

			return { success: false, error: errorData };
		}

		const data = JSON.parse(responseText);
		return { success: true, data: successParser(data) };
	} catch (error) {
		return {
			success: false,
			error: {
				detail:
					error instanceof Error ? error.message : "Unknown error occurred",
				code: "PARSING_ERROR",
			},
		};
	}
};

/**
 * Subscribe an email address to the newsletter (Functional approach)
 */
export async function subscribeToNewsletter(
	subscriberData: SubscriberInput,
): Promise<ButtondownResult<SubscriberResponse>> {
	if (!validateApiKey(BUTTONDOWN_CONFIG.apiKey)) {
		return {
			success: false,
			error: { detail: "Buttondown API key not configured" },
		};
	}

	try {
		const response = await fetch(`${BUTTONDOWN_CONFIG.baseUrl}/subscribers`, {
			method: "POST",
			headers: createApiHeaders(BUTTONDOWN_CONFIG.apiKey),
			body: JSON.stringify(subscriberData),
		});

		return handleApiResponse(
			response,
			(data: unknown) => data as SubscriberResponse,
		);
	} catch (error) {
		return {
			success: false,
			error: {
				detail:
					error instanceof Error ? error.message : "Network error occurred",
				code: "NETWORK_ERROR",
			},
		};
	}
}

/**
 * Subscribe an email address to the newsletter (Legacy throwing approach for backward compatibility)
 */
export async function subscribeToNewsletterLegacy(
	subscriberData: SubscriberInput,
): Promise<SubscriberResponse> {
	const result = await subscribeToNewsletter(subscriberData);

	if (!result.success) {
		// Handle specific error cases for better user experience
		if (
			result.error.code === "email_already_exists" ||
			result.error.detail.includes("already exists")
		) {
			throw new Error(
				"This email address is already subscribed to our newsletter.",
			);
		}

		if (
			result.error.code === "email_invalid" ||
			result.error.detail.includes("invalid")
		) {
			throw new Error("Please enter a valid email address.");
		}

		throw new Error(result.error.detail || "Failed to subscribe to newsletter");
	}

	return result.data;
}

/**
 * Check if an email is already subscribed (Functional approach)
 */
export async function checkSubscription(
	email: string,
): Promise<ButtondownResult<boolean>> {
	if (!validateApiKey(BUTTONDOWN_CONFIG.apiKey)) {
		return {
			success: false,
			error: { detail: "Buttondown API key not configured" },
		};
	}

	try {
		const response = await fetch(
			`${BUTTONDOWN_CONFIG.baseUrl}/subscribers?email_address=${encodeURIComponent(email)}`,
			{
				method: "GET",
				headers: createApiHeaders(BUTTONDOWN_CONFIG.apiKey),
			},
		);

		return handleApiResponse(response, (data: unknown) => {
			const responseData = data as { results?: unknown[] };
			return Boolean(responseData.results && responseData.results.length > 0);
		});
	} catch (error) {
		return {
			success: false,
			error: {
				detail:
					error instanceof Error ? error.message : "Network error occurred",
				code: "NETWORK_ERROR",
			},
		};
	}
}

/**
 * Check if an email is already subscribed (Legacy approach for backward compatibility)
 */
export async function checkSubscriptionLegacy(email: string): Promise<boolean> {
	const result = await checkSubscription(email);
	return result.success ? result.data : false;
}

/**
 * Unsubscribe an email address from the newsletter (Functional approach)
 */
export async function unsubscribeFromNewsletter(
	email: string,
): Promise<ButtondownResult<void>> {
	if (!validateApiKey(BUTTONDOWN_CONFIG.apiKey)) {
		return {
			success: false,
			error: { detail: "Buttondown API key not configured" },
		};
	}

	try {
		const response = await fetch(
			`${BUTTONDOWN_CONFIG.baseUrl}/subscribers/${encodeURIComponent(email)}`,
			{
				method: "DELETE",
				headers: createApiHeaders(BUTTONDOWN_CONFIG.apiKey),
			},
		);

		if (!response.ok && response.status !== 404) {
			return handleApiResponse(response, () => undefined);
		}

		return { success: true, data: undefined };
	} catch (error) {
		return {
			success: false,
			error: {
				detail:
					error instanceof Error ? error.message : "Network error occurred",
				code: "NETWORK_ERROR",
			},
		};
	}
}

/**
 * Unsubscribe an email address from the newsletter (Legacy approach for backward compatibility)
 */
export async function unsubscribeFromNewsletterLegacy(
	email: string,
): Promise<void> {
	const result = await unsubscribeFromNewsletter(email);
	if (!result.success) {
		throw new Error(
			result.error.detail || "Failed to unsubscribe from newsletter",
		);
	}
}
