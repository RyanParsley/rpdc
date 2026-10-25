import { describe, expect, it } from "vitest";

import { filesIn } from "./repo";

// ADR 6: file naming is per-directory, and no ESLint rule expresses that without a
// stack of overrides, so the check lives here (ADR 8). `src/content/**` is exempt:
// those filenames become published URLs and slugs, which are product decisions
// rather than code style. Exempt is written down on purpose - a directory that is
// silently skipped looks identical to a rule that never ran.

const PASCAL_DIRS = ["src/components", "src/layouts"];
const KEBAB_DIRS = ["src/utils", "src/integrations", "src/types"];

/**
 * Only the first segment matters: `Backlinks.test.tsx` and
 * `Webmentions.integration.test.ts` both describe the component they test, and ADR 6
 * records the test files as PascalCase alongside their components.
 */
const stem = (file: string): string => file.split(".")[0] ?? file;

const pascalOffenders = (dir: string): string[] =>
	filesIn(dir)
		.filter((file) => !/^[A-Z][A-Za-z0-9]*$/.test(stem(file)))
		.map((file) => `${dir}/${file}`);

const kebabOffenders = (dir: string): string[] =>
	filesIn(dir)
		.filter((file) => !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(stem(file)))
		.map((file) => `${dir}/${file}`);
describe("ADR 6: PascalCase components, kebab-case modules", () => {
	it("keeps components and layouts PascalCase", () => {
		const offenders = PASCAL_DIRS.flatMap(pascalOffenders);

		expect(
			offenders,
			`ADR 6: files in ${PASCAL_DIRS.join(
				", ",
			)} must start with an uppercase segment (rename, or move the file): ${offenders.join(
				", ",
			)}`,
		).toEqual([]);
	});

	it("keeps utils, integrations and types kebab-case", () => {
		const offenders = KEBAB_DIRS.flatMap(kebabOffenders);

		expect(
			offenders,
			`ADR 6: files in ${KEBAB_DIRS.join(
				", ",
			)} must be lowercase with hyphens between words (rename, or move the file): ${offenders.join(
				", ",
			)}`,
		).toEqual([]);
	});

	it("has the directories it claims to gate", () => {
		// A glob that matches nothing passes forever, which is the failure mode this
		// whole effort exists to remove. Assert the gated directories exist and are
		// non-empty before trusting the two checks above.
		for (const dir of [...PASCAL_DIRS, ...KEBAB_DIRS]) {
			expect(
				filesIn(dir).length,
				`ADR 6: ${dir} is empty or missing`,
			).toBeGreaterThan(0);
		}
	});

	it("leaves content slugs out of the rule", () => {
		// The exemption is a decision, not an accident: `src/content/blog` holds
		// published slugs like `OpenWebUI.md` that would be violations under the
		// kebab rule. If someone starts gating `src/content/**`, this fails and the
		// argument happens in the open.
		const contentFiles = filesIn("src/content/blog");
		const wouldViolateKebab = contentFiles.filter(
			(file) => !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(stem(file)),
		);

		expect(
			wouldViolateKebab.length,
			"ADR 6: src/content/** is exempt because slugs become URLs",
		).toBeGreaterThan(0);
	});
});
