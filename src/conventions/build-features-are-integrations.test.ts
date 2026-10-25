import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { filesIn, readRepoFile, repoPath } from "./repo";

// The audit's Tier D row: "build-time features are integrations, not standalone
// scripts". `AGENTS.md` states that as policy, and the only reason it holds is that
// nothing stops the next build-time step from landing as a shell script in
// `.cloudcannon/`, which is exactly what `.cloudcannon/postbuild` was (MG-011, #312
// moves its diagnostics into the integration). A policy with no check decays back
// into the shape that needed the policy.

const INTEGRATION_GLOBS = [
	"src/integrations/gnuplot-charts.ts",
	"src/integrations/posse.ts",
];

describe("build-time features are Astro integrations, not standalone scripts", () => {
	it("registers every integration module the tree declares", () => {
		const config = readRepoFile("astro.config.mjs");
		// "Declares an integration" is detectable: the module imports the
		// AstroIntegration type. Hard-coded on purpose for the first pass - deriving it
		// from the directory would need to ignore helper modules in the same folder
		// (image.ts, posse-mastodon.ts, ephemera-schema.ts) that are not integrations.
		const declared = INTEGRATION_GLOBS.filter((file) =>
			readRepoFile(...file.split("/")).includes("AstroIntegration"),
		);
		// Astro config imports are extensionless: `"./src/integrations/posse"`.
		const unregistered = declared.filter(
			(file) => !config.includes(`"./${file.replace(/\.ts$/, "")}"`),
		);

		expect(
			unregistered,
			`astro.config.mjs does not import these integration modules: ${unregistered.join(", ")}`,
		).toEqual([]);
		expect(
			declared.length,
			"the integration list matched nothing, so this test would be vacuous",
		).toBeGreaterThan(0);
	});

	it("keeps the cloudcannon hook free of network and git work", () => {
		// #312 deletes this file. Asserting "absent" here would make the test fail on
		// `main` today, so the claim is the weaker one that is true either way: if the
		// hook exists, it must not execute git or reach the network. Build-time git
		// operations belong in the POSSE integration, where the Logger and the error
		// handling are.
		if (!existsSync(repoPath(".cloudcannon", "postbuild"))) {
			return;
		}

		const script = readRepoFile(".cloudcannon", "postbuild");
		// Command positions only. A plain substring search for `git` fails on the real
		// file, whose comments and `echo` strings say "git operations are handled by
		// the POSSE integration" - prose mentioning git is not the same as running it.
		const commands = script
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line !== "" && !line.startsWith("#"))
			.flatMap((line) => [
				...[...line.matchAll(/(?:^|\$\(|&&|\|\||;)\s*([a-z][\w.-]*)/g)].map(
					(m) => m[1] ?? "",
				),
			]);
		const offenders = commands.filter((word) =>
			["git", "curl", "wget"].includes(word),
		);

		expect(
			offenders,
			`.cloudcannon/postbuild performs build-time work outside an integration: ${offenders.join(", ")}`,
		).toEqual([]);
	});
});

describe("src/conventions is not silently skipped", () => {
	it("finds the test files it claims to hold", () => {
		// One rule per file (ADR 8, #289). If this directory stops containing them,
		// the gates above stopped running, and a green suite would hide it.
		const tests = filesIn("src/conventions").filter((f) =>
			f.endsWith(".test.ts"),
		);

		expect(tests.sort()).toEqual([
			"agents-gates.test.ts",
			"build-features-are-integrations.test.ts",
			"file-naming.test.ts",
		]);
	});
});
