import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { readRepoFile, repoPath } from "./repo";

interface PackageJson {
	scripts?: Record<string, string>;
	devDependencies?: Record<string, string>;
	dependencies?: Record<string, string>;
}

// The meta-rule from the audit's Tier D table, and the failure mode this whole
// effort was created to remove: `AGENTS.md` opens its Quality Gates section with
// "Every gate below is a command", and has previously carried commands that did not
// exist and measurements that were parse bugs. This test checks the claim is
// structurally true.
//
// Scope, stated plainly: it asserts a gate is *runnable* - the named script exists
// in `package.json`, or the named tool is installed - not that it exits 0. Running
// the gates here would mean a unit test that shells out to `npm run build`, which is
// both slower than the rest of the suite combined and a second, weaker copy of CI.
// Green/red is CI's job; this test owns "the docs are not lying about what exists".

const qualityGates = (): string => {
	const agents = readRepoFile("AGENTS.md");
	const start = agents.indexOf("## Quality Gates");
	const end = agents.indexOf("\n## ", start + 1);

	expect(
		start,
		"AGENTS.md has no '## Quality Gates' section",
	).toBeGreaterThanOrEqual(0);

	return agents.slice(start, end === -1 ? agents.length : end);
};

const packageJson = (): PackageJson =>
	JSON.parse(readRepoFile("package.json")) as PackageJson;

/** The first backticked command of each bullet, which is the gate itself. */
const gateCommands = (section: string): string[] =>
	section
		.split("\n")
		.filter((line) => /^-\s+\*\*/.test(line))
		.map((line) => line.match(/`([^`]+)`/)?.[1])
		.filter((cmd): cmd is string => cmd !== undefined);

describe("AGENTS.md claims only runnable gates", () => {
	const commands = gateCommands(qualityGates());

	it("finds gate bullets at all", () => {
		// A section that stopped matching would make every assertion below vacuous.
		expect(commands.length).toBeGreaterThanOrEqual(5);
	});

	it("resolves every npm run script it names", () => {
		const scripts = packageJson().scripts ?? {};
		const named = commands
			.map((cmd) => cmd.match(/^npm run ([\w:-]+)/)?.[1])
			.filter((name): name is string => name !== undefined);
		const missing = named.filter((name) => scripts[name] === undefined);

		expect(
			missing,
			`AGENTS.md names \`npm run X\` gates that are not in package.json: ${missing.join(", ")}`,
		).toEqual([]);
	});

	it("resolves every npx tool it names", () => {
		const pkg = packageJson();
		const deps = {
			...pkg.dependencies,
			...pkg.devDependencies,
		};
		const named = commands
			.map((cmd) => cmd.match(/^npx ([\w.@-]+)/)?.[1])
			.filter((tool): tool is string => tool !== undefined);
		// `astro check` ships as `astro`; a scoped name may be declared without the
		// scope prefix matching exactly, so fall back to the installed binary.
		const missing = named.filter(
			(tool) =>
				deps[tool] === undefined &&
				!existsSync(join(repoPath("node_modules", ".bin"), tool)),
		);

		expect(
			missing,
			`AGENTS.md gates depend on tools that are not dependencies: ${missing.join(", ")}`,
		).toEqual([]);
	});

	it("names a script for every gate, in some form", () => {
		const unrunnable = commands.filter(
			(cmd) => !/^npm run [\w:-]+/.test(cmd) && !/^npx [\w.@-]+/.test(cmd),
		);

		expect(
			unrunnable,
			`Quality Gates bullets whose first command is neither npm run nor npx: ${unrunnable.join(" | ")}`,
		).toEqual([]);
	});

	it("matches the docs' CI claims to the workflows that exist", () => {
		// The useful half of "only claim runnable gates": a gate that says it runs in
		// CI must have a workflow running it, and a gate that admits it does not must
		// not have one. Either half drifting is what made this repo's `AGENTS.md` carry
		// three false claims at once.
		const workflows = readdirSync(repoPath(".github", "workflows"))
			.filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
			.map((f) => readRepoFile(".github", "workflows", f))
			.join("\n");

		const claims = qualityGates()
			.split("\n")
			.filter((line) => /^-\s+\*\*/.test(line))
			.map((line) => ({
				command: line.match(/`([^`]+)`/)?.[1] ?? "",
				inCi: /in CI/i.test(line) && !/not in ci/i.test(line),
				excluded: /not in ci/i.test(line),
			}));

		const wronglyClaimed = claims.filter(
			(c) => c.inCi && !workflows.includes(c.command),
		);
		const wronglyExcluded = claims.filter(
			(c) => c.excluded && workflows.includes(c.command),
		);

		expect(
			wronglyClaimed.map((c) => c.command),
			"AGENTS.md says these gates run in CI, but no workflow runs them",
		).toEqual([]);
		expect(
			wronglyExcluded.map((c) => c.command),
			"AGENTS.md says these gates are not in CI, but a workflow does run them",
		).toEqual([]);
	});
});
