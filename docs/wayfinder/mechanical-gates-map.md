---
labels: wayfinder:map
---

# Wayfinder Map: Mechanical Gates for Style Policy

## Destination

Every style and quality rule that `AGENTS.md` asserts is either (a) enforced by a
command that can fail a build, or (b) explicitly labelled advisory with a reason
recorded in an ADR. No rule is left as prose alone, and no prose rule claims a
number the tooling does not check.

Evidence baseline and measured counts:
[`docs/tech-debt/mechanical-gates-audit.md`](../tech-debt/mechanical-gates-audit.md)
(2026-10-13, amended 2026-10-14). Decisions: ADR 2 through ADR 8, **all accepted**.

## Notes

- **Domain:** ESLint flat config, Prettier, Stylelint, Vale, Vitest coverage,
  husky, `.github/workflows/build.yml`, one POSSE integration hook. No runtime
  behaviour changes except MG-011.
- **Invariant:** build output must not change. If a gate forces a source edit
  that alters emitted HTML, stop and re-scope.
- **Verify every story with the full existing gate, not just its own rule:**
  `npx astro check && npm run lint && npm run build && npm run test:run`
- **Count before gating.** Tier B counts came from throwaway measurement configs
  and each story re-measures itself before writing code; a rule whose count moved
  gets re-scoped, not squeezed into the same PR.
- **Suggested labels:** `enhancement` (matches what TQ-00x used; verified via
  `gh label list`).
- **Issues filed 2026-10-14:** **#281–#292**. Story-to-issue mapping is in each
  heading below. MG-012 stays out of this map (separate epic), and the commitlint
  + shellcheck backlog items are unfiled until they're next up.

## Decided 2026-10-14

| Item | Outcome | Effect on this map |
| ---- | ------- | ------------------ |
| ADRs 2, 4, 8 | accepted (`adrs status N accepted`) | unblocks MG-001 and MG-004 |
| Coverage denominator | option (c): `coverage.include` + floors re-derived from the honest number + a convention test that no source file is at 0% | threshold work **moved out of MG-001** into new MG-001b; ADR 5 amended |
| Scripts vs coverage floor | option (a): own per-file floors via Vitest glob thresholds | folded into MG-001b; MG-008 retired |
| `recommendedTypeChecked` | option (a): separate epic, own map, own ADR | MG-012 leaves this map |
| Playwright cadence | option (a): every PR | MG-010 becomes sequenced; third-party hosts verified as attribute-only assertions |
| `.cloudcannon/postbuild` | option (c): move validation into the integration hook, delete the script | MG-011; needs a scope note, see Out of scope |
| GitHub issues | yes, sequenced stories only | **filed: #281–#292** (12 issues) |
| Commit shape | two commits | `chore: init ADR tooling` then `docs: ...` |

## Ready to execute

Ordered by dependency. MG-001 → MG-001b → MG-004 → MG-002 → {MG-003, MG-005,
MG-006} → MG-013 → {MG-010, MG-011, MG-009}.

### MG-001 / [#281](https://github.com/RyanParsley/rpdc/issues/281) - Tier A: config-only gates

Zero source changes except autoformatting. Everything here measures 0 violations
today, so the PR is the gate plus the docs correction. ADR 2, ADR 3.

- `eslint.config.mjs`, scoped `src/**/*.{ts,astro}`: `no-restricted-globals`
  (`console`), `no-var`, `prefer-const`.
- Append `eslint-config-prettier` (installed, referenced by nothing) as the last
  config entry so ESLint cannot hold a view on format.
- Scripts: `format:check`, `lint:style:check` (no `--fix`), `lint:prose`
  (`vale --minAlertLevel=warning src/content`).
- `.prettierignore` for `public/**` assets, so `stormtrooper_bear.js` is excluded
  rather than reformatted.
- `build.yml`: add `format:check`, `lint:style:check`, `lint:prose`.
- Docs correction: tabs + double quotes + semicolons; per-directory naming rule
  replacing two contradictory bullets (ADR 6); "100% coverage" replaced with the
  ratchet wording and the current actual.
- **Only file edits:** `prettier --write` on `src/content.config.ts` and
  `.github/workflows/weekly-digest.yml`.
- **Deliberately not here:** coverage thresholds. See MG-001b.
- **Verify:** `npm run format:check && npm run lint && npm run lint:style:check && npm run lint:prose && npm run test:run`

### MG-001b / [#282](https://github.com/RyanParsley/rpdc/issues/282) - Coverage denominator honesty (ADR 5 amendment)

- Add `coverage.include` for `src/**` and `scripts/**`; expect the reported
  number to fall from 90.99 to roughly 57.8 aggregate.
- Replace the single aggregate floor with glob-keyed thresholds: per-directory
  floors for `src/integrations/**` and `src/utils/**`, per-file floors for
  `scripts/send-digest.js` (76.84 statements measured), aggregate as backstop.
- Add the "no source file at 0%" convention test (ADR 8) backed by a named debt
  register: `scripts/new-content.js`, `scripts/pesos-mastodon.js`,
  `scripts/promote-draft.js`, `src/integrations/ephemera-schema.ts`. The register
  shrinks as each gets tests; it does not get widened silently.
- Record the `.astro` blind spot in the config comment: 23 components and every
  page/layout cannot be instrumented, so MG-010 is the only gate that sees them.
- Do not enable `autoUpdate`; it rewrites a tracked file from inside CI.
- **Verify:** `npm run test:coverage` twice - the second run must fail if any
  threshold is above actual.

### MG-004 / [#283](https://github.com/RyanParsley/rpdc/issues/283) - Alias source of truth (ADR 4)

Add `@/*`, `@utils/*`, `@integrations/*` to `tsconfig.json` `paths`; derive
Vitest's `resolve.alias` from the same list. Blocks MG-002. Decide whether
`@data/*` stays (0 uses today).

### MG-002 / [#284](https://github.com/RyanParsley/rpdc/issues/284) - Ban deep relative imports (13 prod)

`no-restricted-imports` pattern `../../**` on `src/**`. All 13 are
`../../../content.config` from pages; they become `@/content.config`.

### MG-003 / [#285](https://github.com/RyanParsley/rpdc/issues/285) - `consistent-type-definitions: interface` (8 prod)

Mechanical `type X = {}` -> `interface X`: `Audio.astro`, `ImageGallery.astro`,
`Item.astro`, `SyndicationLinks.astro`, `src/integrations/image.ts`.

### MG-005 / [#286](https://github.com/RyanParsley/rpdc/issues/286) - `prefer-optional-chain` (5 prod, 15 test)

Error in production code, off for tests. Autofix and gate in one PR.

### MG-006 / [#287](https://github.com/RyanParsley/rpdc/issues/287) - `no-non-null-assertion` (4 prod, 13 test)

Prod-only gate; includes `posse.ts:537` (`result.url!`). Test usage stays allowed
through a `files` override, not inline disables - the repo has zero
`eslint-disable` comments and MG-001 keeps it that way.

### MG-013 / [#289](https://github.com/RyanParsley/rpdc/issues/289) - Convention tests (ADR 8)

`src/conventions/`: naming per directory (ADR 6), tsconfig/vitest alias parity
(ADR 4), "no build-time logic in standalone scripts", and the `AGENTS.md`
self-audit asserting each documented gate is a runnable script. Read-only fs and
config imports, one rule per file, failure messages that name the path and the
rule. The self-audit is what keeps this map from being a one-time cleanup.

### MG-010 / [#290](https://github.com/RyanParsley/rpdc/issues/290) - Playwright in CI, every PR

Add a job that runs `npm run test:e2e`. `playwright.config.ts` sets
`webServer: { command: "npm run build && npm run preview", port: 4321,
timeout: 120000 }` and `workers: 1`, so budget roughly one extra full build per
PR. Verified: the `formspree.io` and `buttondown.com` strings in
`tests/forms.spec.ts` are `toHaveAttribute("action", ...)` expectations only, and
every navigation is `page.goto()` against localhost, so nothing calls a third
party. This is the only gate that sees `.astro`.

### MG-011 / [#291](https://github.com/RyanParsley/rpdc/issues/291) - Postbuild validation into the integration, delete the script

Move the syndication-count diagnostics from `.cloudcannon/postbuild` into the
POSSE integration's `astro:build:done` hook using the injected `Logger`
(`src/types/logger.ts`), then delete the file. Removes the only standalone script
and with it the dead duplicate `#!/bin/bash` on line 3. Needs the Out-of-scope
note below lifted, and CloudCannon's postbuild hook contract checked before
deleting (the directory may be required even if the file is not).

### MG-009 / [#292](https://github.com/RyanParsley/rpdc/issues/292) - Import grouping and order

`eslint-plugin-simple-import-sort` for the "external libs, then internal" rule.
New dependency; count violations after install before deciding error vs warn.

## Needs your decision

- **MG-007 / [#288](https://github.com/RyanParsley/rpdc/issues/288) - `explicit-function-return-type`.** Verified: the rule's full option
  set is `allowConciseArrowFunctionExpressionsStartingWithVoid`,
  `allowDirectConstAssertionInArrowFunctions`, `allowedNames`, `allowExpressions`,
  `allowFunctionsWithoutTypeParameters`, `allowHigherOrderFunctions`, `allowIIFEs`,
  `allowTypedFunctionExpressions`. No export-scope option, so it cannot express
  "exported functions only" symbol by symbol - but flat config can scope it by
  **file glob**, which is a different answer than the one I first gave you.
  - (a) gate everywhere: 14 prod violations, 9 of them in `src/pages`, 2 in components
  - (b) advisory + rewrite the docs line to describe what is enforceable
  - (c) plugin or custom rule that understands export scope
  - (d) **gate on module-boundary directories only**
    (`src/integrations`, `src/utils`, `src/types`): **3 prod violations**, listed
    in ADR 7's amendment; `.astro`, pages, and layouts exempt
  Recommendation: (d). If chosen, ADR 7 keeps only the `prefer-nullish-coalescing`
  half and the return-type half becomes an accepted gate.

## Backlog (sequenced after the above)

- **MG-012** `recommendedTypeChecked` - leaves this map. Own wayfinder map, own
  ADR, and it must decide test-file scoping up front: of 76 measured violations,
  41 are production (`restrict-template-expressions` is 10/10 production, which
  means interpolated `unknown` in POSSE paths, not a codemod).
- commitlint `scope-empty: [2, "never"]` limited to `feat`/`fix`/`refactor`, since
  `docs:` commits are frequently unscoped.
- shellcheck, only if shell survives MG-011.

## Out of scope

- Changing generated HTML or any build output
- Migrating `scripts/*.js` to TypeScript
- Renaming component or content files (ADR 6 gates the convention, it does not
  retrofit names)
- Bulk `prefer-nullish-coalescing` autofix - semantics, not style (ADR 7)
- New syndication platforms
- Adding test coverage for the four files in MG-001b's debt register; that is
  separate work with its own cost
- **Scope note:** MG-011 touches POSSE internals (moving diagnostics into an
  existing hook). That is not the excluded "rewriting the POSSE orchestration
  flow", but it is the one story here that edits syndication code, so it is
  called out rather than smuggled in.

## Done

_(nothing yet)_
