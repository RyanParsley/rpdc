import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { mastodonHandlers } from "./mocks/mastodon";
import { blueskyHandlers } from "./mocks/bluesky";

// Setup MSW server for API mocking
export const server = setupServer(...mastodonHandlers, ...blueskyHandlers);

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => server.resetHandlers());

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

import type { TestUtils, MockLogger } from "../integrations/posse";

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
