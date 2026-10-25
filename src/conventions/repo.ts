import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { vi } from "vitest";

// Shared plumbing for the repo-shape convention tests (ADR 8, #289). Read-only:
// these helpers list and read files, never write them.
//
// Why not `import.meta.url` + `fileURLToPath`: the suite runs in the jsdom
// environment, where the module URL is not a `file:` URL, so resolving the repo
// root that way throws `TypeError: The URL must be of scheme file`. `process.cwd()`
// is the root when Vitest runs, but `src/test/setup.ts` stubs it to
// `/mock/project/root` for the modules under test, so the stub is lifted here. The
// same trick already appears in `vitest.config.test.ts` for `path`.

vi.spyOn(process, "cwd").mockRestore();

export const repoRoot = (): string => process.cwd();

export const repoPath = (...segments: string[]): string =>
	join(repoRoot(), ...segments);

export const readRepoFile = (...segments: string[]): string =>
	readFileSync(repoPath(...segments), "utf-8");

/** Immediate file names in a repo-relative directory, excluding dotfiles. */
export const filesIn = (dir: string): string[] => {
	const absolute = repoPath(dir);

	return readdirSync(absolute)
		.filter((name) => !name.startsWith("."))
		.filter((name) => statSync(join(absolute, name)).isFile())
		.sort();
};
