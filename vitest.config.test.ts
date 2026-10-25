import { existsSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";

import tsconfig from "./tsconfig.json";

// The global test setup mocks `path` for the modules under test and stubs
// `process.cwd()`, but this file loads the real config, which calls
// `path.resolve(process.cwd(), …)` at module scope — so lift both stubs, then
// load it dynamically. Without this the derived aliases point at
// `/mock/project/root/src/...`, which is a fake path that happens to be
// unresolvable rather than the repo's own directories.
vi.unmock("path");
vi.spyOn(process, "cwd").mockRestore();
const loaded = (await import("./vitest.config")) as {
	default: unknown;
	aliasesFromTsconfig: () => { find: string; replacement: string }[];
};
const config = loaded.default;
const aliases = loaded.aliasesFromTsconfig();

// Guards the decision from #252: coverage thresholds exist and have not been
// lowered back toward zero. If someone drops `coverage.thresholds` or weakens
// one of its numbers, this fails before the CI coverage gate is silently
// disarmed.
type VitestConfig = {
	test?: { coverage?: { thresholds?: Record<string, number> } };
	resolve?: { alias?: { find: string; replacement: string }[] };
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

// ADR 4, #283: `tsconfig.json` `compilerOptions.paths` is the only alias list,
// and the Vitest config derives its table from that file. Parity is therefore
// structural, which is what these tests keep structural: they fail if the
// derivation is replaced by a hand-written list, if an alias stops matching a
// directory that exists, or if the ordering rule quietly changes.
describe("import alias parity (tsconfig paths == vitest alias)", () => {
	const declared = Object.keys(tsconfig.compilerOptions.paths ?? {});

	it("covers every alias declared in tsconfig", () => {
		expect(aliases.map((alias) => alias.find).sort()).toEqual(
			declared.map((key) => key.slice(0, -1)).sort(),
		);
	});

	it("loads from tsconfig rather than a restated list", () => {
		expect((config as VitestConfig).resolve?.alias).toEqual(aliases);
	});

	it("points no alias at a directory that does not exist", () => {
		// The claim `@data/*` rests on is that `data/` is here. If that directory is
		// ever removed, the alias should fail a test rather than an `astro build`.
		const missing = aliases.filter((alias) => !existsSync(alias.replacement));

		expect(missing.map((alias) => alias.find)).toEqual([]);
	});

	it("matches the longest prefix first", () => {
		// Vite takes the first matching entry, so `@components/` has to be tried
		// before `@/`.
		const lengths = aliases.map((alias) => alias.find.length);

		expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
	});
});
