import { describe, it, expect, vi } from "vitest";

// The global test setup mocks `path` for the modules under test, but the real
// config calls `path.resolve` at module scope — so lift that mock, then load it
// dynamically.
vi.unmock("path");
const config = ((await import("./vitest.config")) as { default: unknown })
	.default;

// Guards the decision from #252: coverage thresholds exist and have not been
// lowered back toward zero. If someone drops `coverage.thresholds` or weakens
// one of its numbers, this fails before the CI coverage gate is silently
// disarmed.
type VitestConfig = {
	test?: { coverage?: { thresholds?: Record<string, number> } };
};

const readThresholds = (): Record<string, number> | undefined =>
	(config as VitestConfig).test?.coverage?.thresholds;

describe("vitest coverage thresholds", () => {
	it("loads the real config", () => {
		expect(config).toBeDefined();
	});

	it("sets a floor for every coverage metric", () => {
		expect(readThresholds()).toEqual(
			expect.objectContaining({
				statements: expect.any(Number),
				branches: expect.any(Number),
				functions: expect.any(Number),
				lines: expect.any(Number),
			}),
		);
	});

	it("keeps every metric at or above the agreed 80% floor", () => {
		const thresholds = readThresholds() ?? {};

		expect(Object.keys(thresholds).length).toBe(4);
		for (const [metric, value] of Object.entries(thresholds)) {
			expect(
				value,
				`${metric} threshold dropped below the floor`,
			).toBeGreaterThanOrEqual(80);
		}
	});
});
