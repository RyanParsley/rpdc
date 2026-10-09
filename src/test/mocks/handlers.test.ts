import { describe, it, expect } from "vitest";

/**
 * Guard for the shared MSW mock arrays: every registered handler must be
 * reachable and return its happy-path response by default.
 *
 * #249 removed unreachable "error simulation" handlers that trailed the
 * happy-path handlers for the same URLs, gated on an X-Mock-Error header
 * nothing ever sent. If a shared default breaks or a future handler is
 * added for an already-mocked URL, these tests fail loudly. Error cases
 * belong in scoped server.use() overrides inside the specific tests that
 * need them (auto-reset by afterEach in setup.ts).
 */

describe("shared MSW mocks return happy-path defaults", () => {
	it("mastodon: media upload succeeds with auth", async () => {
		const res = await fetch("https://mastodon.social/api/v1/media", {
			method: "POST",
			headers: { Authorization: "Bearer test-token" },
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.id).toBe("mock-media-id-123");
	});

	it("mastodon: status post succeeds with auth and content", async () => {
		const res = await fetch("https://mastodon.social/api/v1/statuses", {
			method: "POST",
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ status: "hello" }),
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.id).toBe("mock-status-id-456");
	});

	it("bluesky: createSession succeeds with credentials", async () => {
		const res = await fetch(
			"https://bsky.social/xrpc/com.atproto.server.createSession",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					identifier: "test@example.com",
					password: "test-password",
				}),
			},
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.accessJwt).toBe("mock-access-jwt-token");
	});

	it("bluesky: uploadBlob succeeds with auth", async () => {
		const res = await fetch(
			"https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
			{
				method: "POST",
				headers: { Authorization: "Bearer test-token" },
			},
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.blob.ref.$link).toBe("bafkreimockblobref123456789");
	});

	it("bluesky: createRecord succeeds with auth and record", async () => {
		const res = await fetch(
			"https://bsky.social/xrpc/com.atproto.repo.createRecord",
			{
				method: "POST",
				headers: {
					Authorization: "Bearer test-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					repo: "did:plc:mock-user-id",
					collection: "app.bsky.feed.post",
					record: { text: "hello", createdAt: new Date().toISOString() },
				}),
			},
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.uri).toContain("at://did:plc:mock-user-id");
	});
});
