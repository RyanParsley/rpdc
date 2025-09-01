import type { APIRoute } from "astro";
import {
	generateWeeklyDigest,
	formatDigestAsHtml,
} from "../../../utils/digest";

// Disable prerendering for this API route since it makes external API calls
export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		console.log("Generating test weekly digest...");

		const digest = await generateWeeklyDigest();

		console.log(`Found ${digest.totalItems} items for the test digest`);

		if (digest.totalItems === 0) {
			return new Response(
				JSON.stringify({
					success: true,
					message: "No content found for this week",
					digest: {
						totalItems: 0,
						blogCount: 0,
						noteCount: 0,
						ephemeraCount: 0,
					},
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		}

		// Format the digest as HTML for preview
		const htmlContent = formatDigestAsHtml(digest);

		return new Response(
			JSON.stringify({
				success: true,
				message: "Test digest generated successfully",
				digest: {
					totalItems: digest.totalItems,
					blogCount: digest.blogCount,
					noteCount: digest.noteCount,
					ephemeraCount: digest.ephemeraCount,
					weekRange: `${digest.weekStart.toISOString()} - ${digest.weekEnd.toISOString()}`,
					previewHtml: htmlContent.substring(0, 500) + "...", // First 500 chars for preview
					items: digest.items.map((item) => ({
						title: item.title,
						type: item.type,
						date: item.date.toISOString(),
					})),
				},
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	} catch (error) {
		console.error("Test digest error:", error);

		let errorMessage = "Failed to generate test digest";
		const statusCode = 500;

		if (error instanceof Error) {
			errorMessage = error.message;
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
