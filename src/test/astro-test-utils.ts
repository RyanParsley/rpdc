import { render } from "@testing-library/preact";
import { vi } from "vitest";

type ComponentFunction = (props: Record<string, unknown>) => unknown;

interface AstroImageProps {
	src: string;
	alt: string;
	[key: string]: unknown;
}

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

export const renderAstroComponent = (
	component: ComponentFunction,
	props: Record<string, unknown> = {},
) => {
	return render(component(props) as Parameters<typeof render>[0]);
};

export const mockAstroImage = () => {
	vi.mock("@astrojs/image/components", () => ({
		Image: ({ src, alt, ...props }: AstroImageProps) => ({
			type: "img",
			props: { src, alt, ...props },
		}),
	}));
};

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
