import { http, HttpResponse } from "msw";
import type {
	MastodonStatusRequest,
	MastodonStatusResponse,
	MastodonMediaResponse,
} from "../../types/api";

export const mastodonHandlers = [
	// Media upload endpoint
	http.post("https://mastodon.social/api/v1/media", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const response: MastodonMediaResponse = {
			id: "mock-media-id-123",
			type: "image",
			url: "https://mastodon.social/media/mock-image.jpg",
			preview_url: "https://mastodon.social/media/mock-preview.jpg",
		};

		return HttpResponse.json(response);
	}),

	// Status posting endpoint
	http.post("https://mastodon.social/api/v1/statuses", async ({ request }) => {
		const authHeader = request.headers.get("Authorization");
		if (!authHeader?.startsWith("Bearer ")) {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = (await request.json()) as MastodonStatusRequest;
		if (!body.status) {
			return HttpResponse.json(
				{ error: "Missing status content" },
				{ status: 400 },
			);
		}

		const response: MastodonStatusResponse = {
			id: "mock-status-id-456",
			url: "https://mastodon.social/@user/123456789",
			content: body.status,
			created_at: new Date().toISOString(),
			visibility: body.visibility || "public",
			media_attachments: body.media_ids?.length
				? [
						{
							id: body.media_ids[0]!,
							type: "image",
							url: "https://mastodon.social/media/mock-image.jpg",
						},
					]
				: [],
		};

		return HttpResponse.json(response);
	}),

	// Error simulation
	http.post("https://mastodon.social/api/v1/media", async ({ request }) => {
		if (request.headers.get("X-Mock-Error") === "upload-failed") {
			return HttpResponse.json({ error: "Upload failed" }, { status: 500 });
		}
		return HttpResponse.json({ error: "Network error" }, { status: 500 });
	}),
];
