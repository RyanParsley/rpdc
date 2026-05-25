import type { APIRoute } from "astro";
import { subscribeToNewsletter } from "../../../utils/buttondown";

export const prerender = false;

const validateEmail = (email: string): boolean => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

const getErrorRedirectUrl = (message: string): string => {
	const encodedMessage = encodeURIComponent(message);
	return `/newsletter/confirm?status=error&message=${encodedMessage}`;
};

const getSuccessRedirectUrl = (): string => {
	return "/newsletter/confirm?status=success";
};

export const POST: APIRoute = async ({ request }) => {
	if (request.headers.get("content-type")?.includes("application/json")) {
		return new Response(
			JSON.stringify({ error: "Use form submission, not JSON" }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	try {
		const formData = await request.formData();
		const email = formData.get("email");

		if (!email || typeof email !== "string") {
			return Response.redirect(
				getErrorRedirectUrl("Email address is required"),
				302,
			);
		}

		const emailTrimmed = email.trim();

		if (!validateEmail(emailTrimmed)) {
			return Response.redirect(
				getErrorRedirectUrl("Please enter a valid email address"),
				302,
			);
		}

		const subscriberData = {
			email_address: emailTrimmed,
			utm_source: "website" as const,
			utm_medium: "newsletter_signup" as const,
		};

		const result = await subscribeToNewsletter(subscriberData);

		if (!result.success) {
			const errorMessage = result.error.detail;
			const redirectUrl = getErrorRedirectUrl(errorMessage);
			return Response.redirect(redirectUrl, 302);
		}

		return Response.redirect(getSuccessRedirectUrl(), 302);
	} catch (error) {
		console.error("Newsletter subscription error:", error);
		const message =
			error instanceof Error ? error.message : "An unexpected error occurred";
		return Response.redirect(getErrorRedirectUrl(message), 302);
	}
};

export const GET: APIRoute = async () => {
	return Response.redirect("/newsletter", 302);
};
