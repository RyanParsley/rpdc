---
labels: tech-debt
status: open
measured: 2026-10-13
---

# Tech debt: prose policy vs mechanical gates

Inventory of style and quality rules that `AGENTS.md` / `agents/*.md` assert but
that nothing enforces, with measured cost to close each one. Decisions live in
`docs/architecture/decisions/` (ADRs 1-9); the sequenced work lives in
`docs/wayfinder/mechanical-gates-map.md`, filed as GitHub issues **#281–#292**
(12 stories, 2026-10-14; MG-012 `recommendedTypeChecked` is deliberately not in
that range - it leaves for its own map and ADR).

## How to reproduce the numbers

```bash
npx astro check                                              # type gate
npx eslint -c <measure-config> ./src ./scripts --format json # per-rule counts
npm run lint && npm run lint:style
npx prettier --check "**/*.{css,astro,js,mjs,ts,yml,json}"
npx vitest run --coverage
npm run test:e2e
vale --minAlertLevel=warning src/content
```

Counts separate **prod** (`src/**` excluding `*.test.ts`,
`*.integration.test.ts`, `src/test/**`) from **test** files, because a gate that
is cheap in production code can be ruinous in test fixtures.

## Baseline (2026-10-13)

| Gate                                       | Result                                                |
| ------------------------------------------ | ----------------------------------------------------- |
| `astro check`                              | 99 files, 0 errors, 0 warnings, 0 hints               |
| `npm run lint`                             | clean                                                 |
| Stylelint                                  | clean (0 violations, but never runs in CI)            |
| `npx vitest run --coverage`                | 20 files, 324 passed, 2 skipped                       |
| Coverage, default config                   | 90.99 / 85.22 / 97.93 / 91.37 over **9 loaded files** |
| Coverage, honest denominator               | **57.80 / 60.48 / 65.51 / 58.90**                     |
| Coverage thresholds                        | 80 / 80 / 80 / 80                                     |
| `npx prettier --check`                     | 3 files fail                                          |
| `vale --minAlertLevel=warning src/content` | 88 files, 0 errors, 0 warnings, 862 suggestions       |
| Playwright e2e                             | 2 spec files; exists locally, in no CI workflow       |

### Coverage denominator detail

Default config instruments only the files a test imports. Absent, therefore
scored as nothing rather than as zero:

| Unmeasured file                            | Size           | Status                        |
| ------------------------------------------ | -------------- | ----------------------------- |
| `scripts/new-content.js`                   | 444 statements | 0% once included              |
| `scripts/pesos-mastodon.js`                | 397 statements | 0% once included              |
| `scripts/promote-draft.js`                 | 202 statements | 0% once included              |
| `src/integrations/ephemera-schema.ts`      | added in #248  | 0% once included              |
| 23 `.astro` components + all pages/layouts | -              | cannot be instrumented at all |

`--coverage.all=true` is a no-op here (identical 90.99%). `--coverage.include`
works and is what surfaces the zeros. Vitest 4 also supports glob-keyed
thresholds (`thresholds['src/utils/**.ts']`), `perFile`, and `autoUpdate`, so
per-directory floors are native config. See ADR 5's amendment.

## Rules already enforced (no work)

`no-explicit-any` 0 violations, `ban-ts-comment` 0, `eslint-disable` 0, type
checking clean, ESLint clean, conventional commits via `commit-msg` hook
(`core.hooksPath = .husky/_`). These are why the corresponding `AGENTS.md`
claims are true today; anything added to that list should say which command
proves it.

## Tier A: config-only, zero source changes needed

Gate today, because nothing violates it.

| Rule from prose                     | Mechanism                                           | Measured                                                              |
| ----------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| `console.*` routed through `Logger` | `no-restricted-globals` on `src/**`                 | 0 in prod (the 95 hits are all command-line output in `scripts/*.js`) |
| Prefer `const`, never `var`         | `no-var` + `prefer-const`                           | 0                                                                     |
| Formatting matches Prettier         | `format:check` in CI, `eslint-config-prettier` last | 3 files need `--write`; 1 belongs in `.prettierignore`                |
| CSS/style rules                     | `lint:style:check` (no `--fix`) in CI               | 0                                                                     |
| Prose style (Vale)                  | `lint:prose` at `--minAlertLevel=warning`           | 0 alerts                                                              |

Coverage floor **moved out of Tier A.** It was listed here as "thresholds
90/84/97/91"; that number is derived from the narrow denominator and is wrong
under D2(c). It is now MG-001b.

## Tier B: one rule per PR, bounded cleanup

Counts are the whole cost of the PR that gates that rule.

| Rule                                     | prod | test | gate shape                                 | notes                                                 |
| ---------------------------------------- | ---- | ---- | ------------------------------------------ | ----------------------------------------------------- |
| `no-restricted-imports` `../../**`       | 13   | 0    | error on `src/**`                          | depends on `@/*` alias (ADR 4)                        |
| `consistent-type-definitions: interface` | 8    | 0    | error                                      | mechanical `type X = {}` edits                        |
| `prefer-optional-chain`                  | 5    | 15   | error prod, off tests                      | fixable                                               |
| `no-non-null-assertion`                  | 4    | 13   | error prod, off tests                      | `posse.ts:537` `result.url!` etc                      |
| `only-throw-error`                       | 0    | 1    | error                                      | test fixture only                                     |
| `explicit-function-return-type`          | 14   | 25   | **gated on boundary dirs** (MG-007, ADR 9) | 3 edits: 8 framework + 3 closure sites exempt by rule |
| `prefer-nullish-coalescing`              | 13   | 15   | **advisory** (ADR 7)                       | autofix changes semantics                             |

## Tier C: needs a dependency or a new CI job

| Item                            | Lift                                                                                                                                                                                        | status                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Import grouping/order           | needs `eslint-plugin-simple-import-sort`; violation count unknown until installed                                                                                                           | not started                      |
| `recommendedTypeChecked`        | 41 prod / 76 total violations (`no-unsafe-assignment` 10, `restrict-template-expressions` 10, `no-unsafe-member-access` 7, `no-unnecessary-type-assertion` 5, `no-unsafe-return` 5, others) | **separate epic**, own map + ADR |
| Playwright in CI                | `webServer` runs `npm run build && npm run preview`, `workers: 1`, so ~1 extra full build per run                                                                                           | decided: every PR (MG-010)       |
| commitlint `scope-empty: never` | free; `docs:` commits are frequently unscoped, so scope the rule to `feat`/`fix`/`refactor`                                                                                                 | not started                      |

### `.cloudcannon/postbuild`

Decided as (c): validation moves into the POSSE integration's
`astro:build:done` hook and the script is deleted, which is what the
"integrations, not standalone scripts" policy actually wants. Current state of
the file: pure `echo`/`grep`/`find` diagnostics, plus a dead duplicate
`#!/bin/bash` on line 3 that no tool inspects. shellcheck is therefore not needed
for it; it only stays relevant if shell survives elsewhere.

## Tier D: no linter can express it, needs convention tests (ADR 8)

| Rule                                                         | Test                                                                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| PascalCase components / kebab-case modules (ADR 6)           | walk `src/components`, `src/layouts`, `src/utils`, `src/integrations`, `src/types`                               |
| tsconfig paths == vitest alias (ADR 4)                       | import both configs, compare key sets                                                                            |
| Build-time features are integrations, not standalone scripts | assert `.cloudcannon/postbuild` has no `git`/`curl`/`fetch`, and `astro.config.mjs` registers each named feature |
| `AGENTS.md` only claims runnable gates                       | parse the Quality Gates section, assert each named command is a `package.json` script that exits 0               |

## Deliberately not gated

- Return types on framework-dictated signatures (`getStaticPaths` x8) and on
  `.astro` template closures (x3). ADR 9 exempts them on principle: a restated
  framework contract drifts, and closures infer their type at the call site.

- `as const` for readonly data: no rule exists. Stays prose.
- 100% coverage: not achievable for guarded browser branches; ADR 5 replaces the
  claim with a ratchet.
- Bulk `prefer-nullish-coalescing` autofix: see ADR 7.

## Corrections to earlier readings of this repo

- `coverage/` is gitignored (`.gitignore:5`). A local stale `coverage-final.json`
  once read 67.9%; that number is not in git and was superseded by the 90.99%
  measurement.
- The 90.99% figure itself was over-read: it covers the 9 files the suite
  imports, not the source tree. See "Coverage denominator detail".
- `--coverage.all=true` does not widen the denominator in Vitest 4.1.11. The
  flag to use is `coverage.include`.
- `tests/forms.spec.ts` mentions `formspree.io` and `buttondown.com` only inside
  `toHaveAttribute("action", ...)` assertions. Nothing in `tests/` navigates to
  or posts to a third-party host, so e2e in CI does not contact external services.
- A previous reading claimed `@utils` / `@integrations` aliases were usable in
  app code. They are not: they exist only in `vitest.config.ts`, while Astro
  resolves `tsconfig.json` `paths` (`create-vite.js:209` sets
  `resolve.tsconfigPaths: true`).
- `agents/code-quality-agent.md` and the `AGENTS.md` formatting section state
  single quotes, no semicolons, and 2-space indentation. Prettier defaults and
  `.editorconfig` (`indent_style = tab`) say otherwise, and the code follows the
  configs. Both docs need the correction pass in MG-001.
