---
number: 5
title: Coverage thresholds are a measured ratchet, not a 100 percent claim
date: 2026-10-14
status: accepted
tags:
  - testing
  - coverage
links:
  - target: 2
    kind: relatesto
---

# 5. Coverage thresholds are a measured ratchet, not a 100 percent claim

Date: 2026-10-14

## Status

Accepted

## Context

`AGENTS.md` lists "Unit tests with 100% coverage" as a quality gate. The
enforced number is 80%, and the config says so:

```ts
// vitest.config.ts
// Ratchet: 80% is the target agreed in #252. Coverage currently sits
// near 96% statements / 88% branches, so this gates regressions with
// headroom. Raise toward 100% as the remaining error paths land.
thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
```

Measured on 2026-10-13 with `npx vitest run --coverage` (20 files, 324 passed,
2 skipped):

| Metric     | Actual | Threshold | Headroom |
| ---------- | ------ | --------- | -------- |
| Statements | 90.99% | 80        | 10.99    |
| Branches   | 85.22% | 80        | 5.22     |
| Functions  | 97.93% | 80        | 17.93    |
| Lines      | 91.37% | 80        | 11.37    |

The 10-to-18 point gaps are the problem: a regression that deletes or disables
roughly a tenth of the suite still passes CI. The comment's own reference numbers
(96% statements / 88% branches) are also stale against the live measurement.

One file already sits under the floor at 76.84% statements
(`scripts/send-digest.js:146,399-474,482`) and does not fail, because thresholds
are aggregate, not per-file.

## Decision

Thresholds are a ratchet pegged to the last measurement, not an aspiration. Set
the floor just under actuals so a fresh regression fails immediately, and raise
it whenever actuals rise:

```ts
thresholds: { statements: 90, branches: 84, functions: 97, lines: 91 }
```

`AGENTS.md` states the floor and the current actual, and stops claiming 100%.
The ratchet comment keeps recording which issue set the number, as it already
does for #252.

## Consequences

- Coverage regressions larger than ~1 point are caught in CI rather than
  absorbed by headroom.
- The documented gate becomes true, so agents can rely on it.
- Chasing the remaining branches (POSSE network error paths, platform auth
  failures) is now visible as the distance between actual and 100, not hidden
  inside a slogan.
- `scripts/send-digest.js` stays a known hole at 76.84% until per-file gating is
  decided separately; aggregate thresholds do not see it.

## Alternatives considered

- **Leave 80 as the floor.** Rejected: the gap is where silent regressions live.
- **Claim 100% and gate at 100%.** Rejected: unachievable for browser/`astro`
  guarded branches, and a build that permanently fails teaches people to ignore
  it.
- **Per-file thresholds immediately.** Rejected for this change: it fails on the
  first run against `send-digest.js`, so it needs its own decision about whether
  scripts are held to the same bar as `src`.

## Amendment (2026-10-14)

Two things were true that this ADR did not know, and they change the decision.
The `90/84/97/91` thresholds proposed earlier are **not** what gets applied.

**The denominator only counts files the suite imports.** The default config
reports 9 files: `scripts/send-digest.js`, `src/consts.ts`, the five
`src/integrations/posse*`/`image`/`gnuplot-charts` modules, and
`src/utils/backlinks.ts` + `webmentions.ts`. Anything no test imports is absent
rather than zero. `--coverage.all=true` changes nothing (90.99% before and
after). Setting `coverage.include` makes the absences appear as zeros:

| File                                  | Statements    | under honest include                                         |
| ------------------------------------- | ------------- | ------------------------------------------------------------ |
| `scripts/new-content.js`              | 444           | 0%                                                           |
| `scripts/pesos-mastodon.js`           | 397           | 0%                                                           |
| `scripts/promote-draft.js`            | 202           | 0%                                                           |
| `src/integrations/ephemera-schema.ts` | added in #248 | 0%                                                           |
| **All files**                         |               | **57.80 stmts / 60.48 branches / 65.51 funcs / 58.90 lines** |

So "90.99%" was a ratchet on nine files while three untested scripts and one
untested integration module sat outside the measurement entirely.

**`.astro` cannot be measured.** Even with `coverage.include` covering
`src/**/*.astro`, no component, page, or layout appears in the report. 23
components and every route are a permanent coverage blind spot, not a backlog
item. Only Playwright exercises them, which is why MG-010 moved from "backlog"
to "every PR".

### Revised decision

1. Add `coverage.include` for `src/**` and `scripts/**` so absent files become
   visible zeros. The reported number drops to the honest ~58%.
2. Use Vitest's glob-keyed thresholds instead of one aggregate number. Vitest 4
   supports `thresholds['src/utils/**.ts']: { ... }`, `perFile`, and
   `autoUpdate`, so per-directory floors are native config, not a custom harness:

   ```ts
   thresholds: {
     // aggregate backstop, pegged to the honest re-measurement
     statements: 57, branches: 60, functions: 65, lines: 58,
     "src/integrations/**": { statements: 95, branches: 86 },
     "src/utils/**": { statements: 100, branches: 94 },
     "scripts/send-digest.js": { statements: 76, branches: 74 },
   }
   ```

   Exact glob semantics are set in MG-001b, not asserted here.

3. Scripts keep their own floors rather than being exempted, and rather than
   being averaged into `src` where a 444-statement untested file can hide a
   regression in `posse.ts`.
4. A convention test (ADR 8) asserts no source file sits at 0%, backed by an
   explicit, named debt register listing the four files. The register is
   the point: the exemption is reviewable and shrinks, instead of being an
   artifact of what happened to be imported.

`autoUpdate: true` is deliberately not enabled. It rewrites `vitest.config.ts`
when coverage rises, which mutates a tracked file from inside CI. The ratchet
stays a human raising a number in a commit.
