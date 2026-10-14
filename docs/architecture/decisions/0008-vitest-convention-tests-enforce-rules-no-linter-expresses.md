---
number: 8
title: Vitest convention tests enforce rules no linter expresses
date: 2026-10-14
status: accepted
tags:
- testing
- convention
- ci
links:
- target: 2
  kind: relatesto
- target: 4
  kind: relatesto
- target: 6
  kind: relatesto
---

# 8. Vitest convention tests enforce rules no linter expresses

Date: 2026-10-14

## Status

Proposed

## Context

Some rules in this repo are about the shape of the repository rather than the
contents of a file, so no ESLint rule can see them:

- File naming differs per directory (ADR 6).
- `tsconfig.json` `paths` and `vitest.config.ts` `resolve.alias` must describe
  the same set (ADR 4).
- Build-time features must be registered Astro integrations, not standalone
  scripts. `.cloudcannon/postbuild` exists today and already contains a dead
  duplicate `#!/bin/bash` on line 3 that no tool inspects.
- `AGENTS.md` should only claim gates that exist as runnable commands. This is
  the failure mode ADR 2 exists to remove.

The repo already has a working precedent for testing the project's own
configuration: `vitest.config.test.ts` sits at the root, next to the config it
guards, with a comment explaining why it lives there. That test runs in the same
suite as everything else, and CI already executes it via `npm run test:coverage`
in `.github/workflows/build.yml`.

## Decision

Repository-shape rules live in Vitest tests, in a `src/conventions/` directory,
one file per rule, each test naming the rule and its ADR in the failure message.

Constraints that keep them honest:

- Read-only: `node:fs`, `node:path`, config imports. No build, no network, no
  Astro dev server.
- Fast: each file well under 100ms, so the suite's 1.5s stays 1.5s.
- Assertion messages state the offending path and the rule, because a
  convention test that fails with "expected true" trains people to delete tests.
- One rule per file, so a rejected convention is one `git rm`.

## Consequences

- Rules that were only prose now fail CI with no new tooling, because the test
  runner is already a gate.
- The docs self-audit test makes `AGENTS.md` claims checkable, which is the
  mechanism that keeps ADR 2 from decaying back into the current state.
- These tests encode policy, so they carry maintenance cost when policy changes.
  Keeping one rule per file bounds that cost.
- Coverage accounting must exclude `src/conventions/**` from denominators that
  measure production code, or the ratchet in ADR 5 gets muddied by fs calls.

## Alternatives considered

- **A custom ESLint plugin for repo-shape rules.** Rejected: a plugin runs per
  file with no view of the tree, which is exactly the wrong shape, and the
  authoring cost is high.
- **`scripts/check-conventions.js` run from CI.** Rejected: it recreates the
  standalone-script pattern `AGENTS.md` explicitly argues against, adds a second
  test runner, and reports outside the existing gate.
- **A shell pre-commit script with `find` and `grep`.** Rejected: does not run in
  CI, and bypassable with `--no-verify` in a way a failing test is not.
