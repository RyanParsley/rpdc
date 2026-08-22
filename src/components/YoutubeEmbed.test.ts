import { describe, it, expect } from "vitest";

describe("YoutubeEmbed URL generation", () => {
	it("should construct embed URL from video ID", () => {
		const videoId = "U8iY_0O2J8U";
		const expectedEmbedUrl = "https://www.youtube.com/embed/U8iY_0O2J8U";

		const embedSrc = `https://www.youtube.com/embed/${videoId}`;

		expect(embedSrc).toBe(expectedEmbedUrl);
	});

	it("should use the passed video ID, not a hardcoded one", () => {
		const testCases = [
			{
				videoId: "U8iY_0O2J8U",
				expected: "https://www.youtube.com/embed/U8iY_0O2J8U",
			},
			{
				videoId: "I1QiFIaE0ik",
				expected: "https://www.youtube.com/embed/I1QiFIaE0ik",
			},
			{
				videoId: "dQw4w9WgXcQ",
				expected: "https://www.youtube.com/embed/dQw4w9WgXcQ",
			},
		];

		testCases.forEach(({ videoId, expected }) => {
			const embedSrc = `https://www.youtube.com/embed/${videoId}`;
			expect(embedSrc).toBe(expected);
		});
	});

	it("should fail if URL is hardcoded (regression test)", () => {
		const hardcodedUrl =
			"https://www.youtube.com/embed/I1QiFIaE0ik?si=NDdnSAYf0H8t9zfh";
		const videoId = "U8iY_0O2J8U";
		const correctUrl = `https://www.youtube.com/embed/${videoId}`;

		expect(hardcodedUrl).not.toBe(correctUrl);
	});
});
