import type { APIRoute } from "astro";

export const GET: APIRoute = ({ params, request }) => {
	return new Response(JSON.stringify({ ...params, ...request, foo: "bar" }));
};

export const POST: APIRoute = async ({ request }) => {
	const data = await request.formData();
	const email = data.get("EMAIL");
	const firstName = data.get("FNAME");

	// Construct the Mailchimp URL using environment variables
	const listId = import.meta.env.MAILCHIMP_LIST_ID;
	const apiKey = import.meta.env.MAILCHIMP_API_KEY;
	const dataCenter = apiKey.split("-")[1];
	const url = `https://${dataCenter}.api.mailchimp.com/3.0/lists/${listId}/members`;

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `apikey ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email_address: email,
				status: "subscribed",
				merge_fields: {
					FNAME: firstName,
				},
			}),
		});

		if (response.ok) {
			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			});
		} else {
			const errorData = await response.json();
			return new Response(
				JSON.stringify({
					success: false,
					message: errorData.detail || "Failed to subscribe",
				}),
				{
					status: 400,
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		}
	} catch (error) {
		console.error("Error:", error);
		return new Response(
			JSON.stringify({
				success: false,
				message: "An unexpected error occurred",
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
};
