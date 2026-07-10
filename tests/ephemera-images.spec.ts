import { test, expect } from "playwright/test";

const IMAGE_PAGES: { slug: string; filename: string }[] = [
	{ slug: "2024/09/north-pi", filename: "north-pi.jpg" },
	{ slug: "2024/09/smars", filename: "smars.jpg" },
	{ slug: "2024/09/smars-1", filename: "smars-1.jpg" },
	{ slug: "2024/09/cgb-arcade-stick", filename: "cgb-arcade-stick.jpg" },
	{ slug: "2024/09/cgb-arcade-stick-1", filename: "cgb-arcade-stick-1.jpg" },
	{ slug: "2024/10/09/1", filename: "iVoted.jpg" },
	{ slug: "2025/08/31/2025-08-31", filename: "cnc-not-fancy.jpg" },
	{ slug: "2025/09/16/2025-09-16", filename: "CNC-VCarve-OI.jpg" },
	{
		slug: "2025/09/19/2025-09-19-06-11-39",
		filename: "pleasure-fortune.jpg",
	},
];

const ALL_SLUGS: string[] = [
	"2024/08/mesthtastic-youtube-post",
	"2024/09/cgb-arcade-stick-1",
	"2024/09/cgb-arcade-stick",
	"2024/09/north-pi",
	"2024/09/smars-1",
	"2024/09/smars",
	"2024/10/09/1",
	"2024/10/09/2",
	"2024/10/13/1",
	"2024/10/13/2",
	"2024/10/2024-10-03",
	"2024/10/2024-10-07",
	"2024/10/2024-10-10",
	"2024/10/2024-10-11",
	"2024/10/2024-10-22",
	"2025/08/2025-08-15",
	"2025/08/2025-08-30",
	"2025/08/31/2025-08-31",
	"2025/09/16/2025-09-16",
	"2025/09/19/2025-09-19-06-11-39",
	"2026/01/08/2026-01-08-22-22-36",
	"2026/02/19/2026-02-19-18-43-17",
	"2026/02/27/2026-02-27-12-04-30",
	"2026/02/28/2026-02-28-18-29-00",
	"2026/04/12/2026-04-12-13-16-16",
	"2026/04/12/2026-04-12-20-37-46",
];

test.describe("Ephemera pages return 200", () => {
	for (const slug of ALL_SLUGS) {
		test(`GET /ephemera/${slug} returns 200`, async ({ page }) => {
			const response = await page.goto(`/ephemera/${slug}`, {
				waitUntil: "networkidle",
			});
			expect(response?.status()).toBe(200);
		});
	}
});

test.describe("Ephemera hero images load correctly", () => {
	for (const { slug, filename } of IMAGE_PAGES) {
		test(`hero image on /ephemera/${slug}`, async ({ page }) => {
			const brokenImages: string[] = [];
			page.on("response", (response) => {
				if (response.url().includes(filename) && response.status() >= 400) {
					brokenImages.push(response.url());
				}
			});

			await page.goto(`/ephemera/${slug}`, { waitUntil: "networkidle" });
			expect(brokenImages).toEqual([]);

			const heroImg = page.locator("img").first();
			await expect(heroImg).toBeVisible();

			const naturalWidth = await heroImg.evaluate(
				(img: HTMLImageElement) => img.naturalWidth,
			);
			expect(naturalWidth).toBeGreaterThan(0);
		});
	}
});

test.describe("Ephemera listing pages", () => {
	const LISTING_PAGES = [
		{ path: "/ephemera", name: "page 1" },
		{ path: "/ephemera/2", name: "page 2" },
		{ path: "/ephemera/3", name: "page 3" },
		{ path: "/ephemera/4", name: "page 4" },
		{ path: "/ephemera/5", name: "page 5" },
	];

	for (const { path, name } of LISTING_PAGES) {
		test(`${name}: ${path} returns 200 with no broken images`, async ({
			page,
		}) => {
			const brokenImages: string[] = [];
			page.on("response", (response) => {
				if (
					response.request().resourceType() === "image" &&
					response.status() >= 400
				) {
					brokenImages.push(`${response.url()} (${response.status()})`);
				}
			});

			const response = await page.goto(path, {
				waitUntil: "networkidle",
			});
			expect(response?.status()).toBe(200);
			expect(brokenImages).toEqual([]);
		});
	}
});

test.describe("No 404 image requests on any listing page", () => {
	test("ephemera listing pages have no broken image requests", async ({
		page,
	}) => {
		const brokenImages: string[] = [];

		page.on("response", (response) => {
			if (
				response.request().resourceType() === "image" &&
				response.status() >= 400
			) {
				brokenImages.push(`${response.url()} (${response.status()})`);
			}
		});

		for (let i = 1; i <= 5; i++) {
			const path = i === 1 ? "/ephemera" : `/ephemera/${i}`;
			await page.goto(path, { waitUntil: "networkidle" });
		}

		expect(brokenImages).toEqual([]);
	});
});
