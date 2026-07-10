import { defineConfig } from "playwright/test";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	retries: 0,
	workers: 1,
	reporter: "list",
	timeout: 30000,
	expect: {
		timeout: 10000,
	},
	use: {
		baseURL: "http://localhost:4321",
		trace: "retain-on-failure",
	},
	webServer: {
		command: "npm run build && npm run preview",
		port: 4321,
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
	},
});
