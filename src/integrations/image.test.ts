import { describe, it, expect, vi } from "vitest";

// Mirror the pose.test.ts fs-mocking idiom: hoist the mock fns and expose
// them via both the named module shape and `default` so they resolve
// consistently through ESM/CJS interop for every module that imports `fs`.
const fsMocks = vi.hoisted(() => ({
	statSync: vi.fn(),
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

vi.mock("fs", () => ({
	statSync: fsMocks.statSync,
	readdirSync: fsMocks.readdirSync,
	readFileSync: fsMocks.readFileSync,
	writeFileSync: fsMocks.writeFileSync,
	default: {
		statSync: fsMocks.statSync,
		readdirSync: fsMocks.readdirSync,
		readFileSync: fsMocks.readFileSync,
		writeFileSync: fsMocks.writeFileSync,
	},
}));

vi.mock("path", async (importOriginal) => {
	const actual = (await importOriginal()) as typeof import("path");
	return actual;
});

import {
	getMimeType,
	getExtensionFromMimeType,
	resolveImagePath,
	createImageResult,
	checkImageSize,
	findProcessedImage,
	processImageForPlatform,
} from "./image";

const logger = {
	debug: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
} as const;

describe("image.getMimeType", () => {
	it("maps known extensions to their MIME types (case-insensitive)", () => {
		expect(getMimeType("image.jpg")).toBe("image/jpeg");
		expect(getMimeType("image.JPEG")).toBe("image/jpeg");
		expect(getMimeType("image.png")).toBe("image/png");
		expect(getMimeType("image.gif")).toBe("image/gif");
		expect(getMimeType("image.webp")).toBe("image/webp");
	});

	it("falls back to image/jpeg for unknown or missing extensions", () => {
		expect(getMimeType("image.bmp")).toBe("image/jpeg");
		expect(getMimeType("no-extension")).toBe("image/jpeg");
	});
});

describe("image.getExtensionFromMimeType", () => {
	it("maps known MIME types to extensions", () => {
		expect(getExtensionFromMimeType("image/jpeg")).toBe(".jpg");
		expect(getExtensionFromMimeType("image/png")).toBe(".png");
		expect(getExtensionFromMimeType("image/gif")).toBe(".gif");
		expect(getExtensionFromMimeType("image/webp")).toBe(".webp");
	});

	it("falls back to .jpg for unknown MIME types", () => {
		expect(getExtensionFromMimeType("image/unknown")).toBe(".jpg");
	});
});

describe("image.resolveImagePath", () => {
	it("resolves ./ sources under src/content/ephemera", () => {
		expect(resolveImagePath("./photo.jpg")).toMatch(
			/src\/content\/ephemera\/photo\.jpg/,
		);
	});

	it("resolves leading-slash sources under public/", () => {
		expect(resolveImagePath("/images/photo.jpg")).toContain("public");
	});

	it("resolves bare sources under src/content/ephemera", () => {
		expect(resolveImagePath("photo.jpg")).toMatch(
			/src\/content\/ephemera\/photo\.jpg/,
		);
	});
});

describe("image.createImageResult", () => {
	it("derives size and mime type from the buffer and path", () => {
		expect(
			createImageResult({
				path: "/tmp/photo.jpg",
				buffer: Buffer.from("hello world"),
			}),
		).toEqual({
			path: "/tmp/photo.jpg",
			size: 11,
			mimeType: "image/jpeg",
		});
	});
});

describe("image.checkImageSize", () => {
	it("returns false when the file cannot be stat'd", () => {
		fsMocks.statSync.mockImplementation(() => {
			throw new Error("ENOENT");
		});
		expect(
			checkImageSize("/definitely/missing/xyz.jpg", "mastodon", logger),
		).toBe(false);
		expect(
			checkImageSize("/definitely/missing/xyz.jpg", "bluesky", logger),
		).toBe(false);
		fsMocks.statSync.mockReset();
	});

	it("honors the per-platform size limit", () => {
		fsMocks.statSync.mockReturnValue({ size: 1024 * 1024 }); // 1MB

		// 1MB exceeds Bluesky's 0.8MB limit, within Mastodon's 8MB limit
		expect(checkImageSize("any.jpg", "bluesky", logger)).toBe(false);
		expect(checkImageSize("any.jpg", "mastodon", logger)).toBe(true);
		expect(logger.debug).toHaveBeenCalled();
		fsMocks.statSync.mockReset();
	});
});

describe("image.findProcessedImage", () => {
	it("returns null when no processed files match", () => {
		fsMocks.readdirSync.mockReturnValue([]);
		expect(findProcessedImage("/src/photo.jpg", false, logger)).toBeNull();
		fsMocks.readdirSync.mockReset();
	});
});

describe("image.processImageForPlatform", () => {
	it("returns null and warns when no image source is usable", () => {
		fsMocks.readdirSync.mockReturnValue([]);
		fsMocks.statSync.mockImplementation(() => {
			throw new Error("ENOENT");
		});

		expect(
			processImageForPlatform(
				{ src: "./nope.jpg", alt: "x" },
				"bluesky",
				logger,
			),
		).toBeNull();
		expect(logger.warn).toHaveBeenCalled();
		fsMocks.statSync.mockReset();
		fsMocks.readdirSync.mockReset();
	});
});
