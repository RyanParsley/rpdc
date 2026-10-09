import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { mastodonHandlers } from "./mocks/mastodon";
import { blueskyHandlers } from "./mocks/bluesky";
import { webmentionHandlers } from "./mocks/webmention";
import { requestLog } from "./request-log";
import "@testing-library/jest-dom";

// Setup MSW server for API mocking
export const server = setupServer(
	...mastodonHandlers,
	...blueskyHandlers,
	...webmentionHandlers,
);

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Capture every intercepted request so tests can assert on endpoint, auth
// headers, and bodies (clone leaves the original body intact for handlers).
server.events.on("request:start", ({ request }) => {
	requestLog.push({
		method: request.method,
		url: request.url,
		headers: request.headers,
		request: request.clone(),
	});
});

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
	server.resetHandlers();
	requestLog.length = 0;
});

// Clean up after all tests are done
afterAll(() => server.close());

// Mock file system operations
import { vi } from "vitest";

// Mock fs module
vi.mock("fs", () => ({
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	readdirSync: vi.fn(),
	statSync: vi.fn(),
}));

// Mock path module
vi.mock("path", () => ({
	join: vi.fn(),
	extname: vi.fn(),
}));

// Mock gray-matter
vi.mock("gray-matter", () => ({
	default: vi.fn(),
}));

// Mock process.cwd
const mockCwd = "/mock/project/root";
vi.spyOn(process, "cwd").mockReturnValue(mockCwd);

import type { EphemeraPost, Logger } from "../integrations/posse";
import type { MastodonConfig } from "../integrations/posse-mastodon";
import type { BlueskyConfig } from "../integrations/posse-bluesky";

// Test-only types live with their consumer (AGENTS.md type-colocation rule).
// MockLogger is just Logger: four vi.fn()s satisfy the Pick-derived interface.
export type MockLogger = Logger;

export interface TestUtils {
	createMockLogger: () => MockLogger;
	createMockEphemeraPost: (overrides?: Record<string, unknown>) => EphemeraPost;
	createMockConfig: () => {
		mastodon: MastodonConfig;
		bluesky: BlueskyConfig;
	};
}

// Global test utilities
declare global {
	var testUtils: TestUtils;
}

global.testUtils = {
	createMockLogger: (): MockLogger => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),

	createMockEphemeraPost: (overrides: Record<string, unknown> = {}) => ({
		file: "test-post.md",
		data: {
			title: "Test Post",
			date: new Date("2024-01-01"),
			syndication: [],
			...((overrides.data as Record<string, unknown>) || {}),
		},
		body: "Test content",
		image: overrides.image as { src: string; alt: string } | undefined,
	}),

	createMockConfig: () => ({
		mastodon: {
			token: "mock-mastodon-token",
			instance: "mastodon.social",
		},
		bluesky: {
			username: "test@example.com",
			password: "mock-password",
		},
	}),
};
