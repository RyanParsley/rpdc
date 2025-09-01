import type { APIRoute } from "astro";
import {
	generateWeeklyDigest,
	formatDigestAsHtml,
} from "../../../utils/digest";
import { createEmail } from "../../../utils/buttondown";

// Disable prerendering for this API route since it makes external API calls
export const prerender = false;

export const POST: APIRoute = async () => {
	try {
		// Generate the weekly digest
		console.log("Generating weekly digest...");
		const digest = await generateWeeklyDigest();

		console.log(`Found ${digest.totalItems} items for the digest`);

		if (digest.totalItems === 0) {
			return new Response(
				JSON.stringify({
					success: false,
					message: "No content found for this week",
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		}

		// Format the digest as HTML
		const htmlContent = formatDigestAsHtml(digest);

		// Create email subject
		const weekStart = digest.weekStart.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
		const weekEnd = digest.weekEnd.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
		const subject = `Weekly Digest: ${weekStart} - ${weekEnd}`;

		// Create the email using Buttondown
		console.log("Creating digest email...");
		const emailData = {
			subject,
			body: htmlContent, // HTML content for the email
			email_type: "public" as const,
			// Remove status to let Buttondown handle sending automatically
		};

		const result = await createEmail(emailData);

		if (!result.success) {
			console.error("Failed to create digest email:", result.error);
			return new Response(
				JSON.stringify({
					success: false,
					message: "Failed to send digest email",
					error: result.error.detail,
				}),
				{
					status: 500,
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		}

		console.log("Digest email sent successfully:", result.data.id);

		return new Response(
			JSON.stringify({
				success: true,
				message: "Weekly digest sent successfully",
				emailId: result.data.id,
				itemCount: digest.totalItems,
				weekRange: `${weekStart} - ${weekEnd}`,
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	} catch (error) {
		console.error("Weekly digest error:", error);

		let errorMessage = "Failed to generate weekly digest";
		let statusCode = 500;

		if (error instanceof Error) {
			errorMessage = error.message;

			// Handle specific error cases
			if (errorMessage.includes("API key not configured")) {
				statusCode = 500;
				errorMessage = "Newsletter service is not properly configured";
			}
		}

		return new Response(
			JSON.stringify({
				success: false,
				message: errorMessage,
			}),
			{
				status: statusCode,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
};
