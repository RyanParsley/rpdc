import { test, expect } from "playwright/test";

test.describe("Contact form", () => {
	test("/contact page renders with form", async ({ page }) => {
		const response = await page.goto("/contact", { waitUntil: "networkidle" });
		expect(response?.status()).toBe(200);

		const form = page.locator("form");
		await expect(form).toBeVisible();
		await expect(form).toHaveAttribute("method", "POST");
		await expect(form).toHaveAttribute(
			"action",
			"https://formspree.io/rmparsley@gmail.com",
		);

		await expect(page.locator('input[name="name"]')).toBeVisible();
		await expect(page.locator('input[name="_replyto"]')).toBeVisible();
		await expect(page.locator('textarea[name="message"]')).toBeVisible();
		await expect(page.locator('input[type="submit"]')).toBeVisible();
	});
});

test.describe("Newsletter signup", () => {
	test("homepage has newsletter signup form", async ({ page }) => {
		const response = await page.goto("/", { waitUntil: "networkidle" });
		expect(response?.status()).toBe(200);

		const form = page.locator("form").filter({
			has: page.locator('input[name="email"]'),
		});
		await expect(form).toBeVisible();
		await expect(form).toHaveAttribute("method", "POST");
		await expect(form).toHaveAttribute(
			"action",
			"https://buttondown.com/api/emails/embed-subscribe/RyanParsley",
		);

		const emailInput = form.locator('input[name="email"]');
		await expect(emailInput).toBeVisible();
		await expect(emailInput).toHaveAttribute("required");
		await expect(emailInput).toHaveAttribute("autocomplete", "email");

		await expect(
			form.locator('input[name="embed"][value="1"]'),
		).toHaveAttribute("type", "hidden");
		await expect(form.locator('button[type="submit"]')).toBeVisible();
	});

	test("/newsletter page renders with signup form", async ({ page }) => {
		const response = await page.goto("/newsletter", {
			waitUntil: "networkidle",
		});
		expect(response?.status()).toBe(200);

		const form = page.locator("form").filter({
			has: page.locator('input[name="email"]'),
		});
		await expect(form).toBeVisible();
		await expect(form).toHaveAttribute(
			"action",
			"https://buttondown.com/api/emails/embed-subscribe/RyanParsley",
		);
	});

	test("/newsletter/confirm page renders", async ({ page }) => {
		const response = await page.goto("/newsletter/confirm", {
			waitUntil: "networkidle",
		});
		expect(response?.status()).toBe(200);
	});
});

test.describe("SubscribeBlock on multiple pages", () => {
	const PAGES_WITH_SUBSCRIBE = [
		"/ephemera/2024/09/north-pi",
		"/ephemera/2024/09/cgb-arcade-stick",
	];

	for (const path of PAGES_WITH_SUBSCRIBE) {
		test(`${path} has newsletter signup form`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: "networkidle" });
			expect(response?.status()).toBe(200);

			const form = page.locator("form").filter({
				has: page.locator('input[name="email"]'),
			});
			await expect(form).toBeVisible();
			await expect(form).toHaveAttribute(
				"action",
				"https://buttondown.com/api/emails/embed-subscribe/RyanParsley",
			);
		});
	}
});
