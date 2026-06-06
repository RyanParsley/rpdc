import { vi } from "vitest";

interface AstroGlobal {
	url: URL;
	site: URL;
}

// Mock Astro globals
vi.mock("astro:env", () => ({
	client: "server",
	server: "server",
}));

// Mock Astro components that might be used in tests
vi.mock("astro:components", () => ({
	default: {},
}));

export const setupAstroMocks = () => {
	(globalThis as Partial<typeof globalThis> & { Astro: AstroGlobal }).Astro = {
		url: new URL("http://localhost:3000"),
		site: new URL("http://localhost:3000"),
	};

	global.fetch = vi.fn();
};

/**
 * Helper to create a test date in a consistent timezone
 */
export const createTestDate = (dateString: string): Date => {
	return new Date(`${dateString}T00:00:00.000Z`);
};
