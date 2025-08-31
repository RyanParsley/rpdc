import { http, HttpResponse } from "msw";
import type {
	BlueskyAuthRequest,
	BlueskyAuthResponse,
	BlueskyPostRequest,
	BlueskyPostResponse,
	BlueskyBlobResponse,
} from "../../types/api";

export const blueskyHandlers = [
	// Authentication endpoint
	http.post(
		"https://bsky.social/xrpc/com.atproto.server.createSession",
		async ({ request }) => {
			const body = (await request.json()) as BlueskyAuthRequest;

			if (!body.identifier || !body.password) {
				return HttpResponse.json(
					{ error: "Missing credentials" },
					{ status: 400 },
				);
			}

			if (body.identifier === "invalid@example.com") {
				return HttpResponse.json(
					{ error: "Invalid credentials" },
					{ status: 401 },
				);
			}

			const response: BlueskyAuthResponse = {
				accessJwt: "mock-access-jwt-token",
				refreshJwt: "mock-refresh-jwt-token",
				handle: body.identifier,
				did: "did:plc:mock-user-id",
			};

			return HttpResponse.json(response);
		},
	),

	// Blob upload endpoint
	http.post(
		"https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
		async ({ request }) => {
			const authHeader = request.headers.get("Authorization");
			if (!authHeader?.includes("Bearer ")) {
				return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
			}

			const response: BlueskyBlobResponse = {
				blob: {
					$type: "blob",
					ref: { $link: "bafkreimockblobref123456789" },
					mimeType: request.headers.get("Content-Type") || "image/jpeg",
					size: 12345,
				},
			};

			return HttpResponse.json(response);
		},
	),

	// Post creation endpoint
	http.post(
		"https://bsky.social/xrpc/com.atproto.repo.createRecord",
		async ({ request }) => {
			const authHeader = request.headers.get("Authorization");
			if (!authHeader?.includes("Bearer ")) {
				return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
			}

			const body = (await request.json()) as BlueskyPostRequest;
			if (!body.record?.text) {
				return HttpResponse.json(
					{ error: "Missing post content" },
					{ status: 400 },
				);
			}

			const response: BlueskyPostResponse = {
				uri: "at://did:plc:mock-user-id/app.bsky.feed.post/mock-post-id",
				cid: "bafyreimockcid123456789",
			};

			return HttpResponse.json(response);
		},
	),

	// Error simulation
	http.post(
		"https://bsky.social/xrpc/com.atproto.server.createSession",
		async ({ request }) => {
			if (request.headers.get("X-Mock-Error") === "auth-failed") {
				return HttpResponse.json(
					{ error: "Authentication failed" },
					{ status: 401 },
				);
			}
			return HttpResponse.json({ error: "Network error" }, { status: 500 });
		},
	),
];
