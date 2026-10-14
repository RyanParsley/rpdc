---
number: 2
title: Codify style policy as mechanical gates, not prose
date: 2026-10-14
status: accepted
tags:
  - style
  - tooling
  - ci
links:
  - target: 3
    kind: relatesto
  - target: 4
    kind: relatesto
  - target: 5
    kind: relatesto
  - target: 6
    kind: relatesto
  - target: 7
    kind: relatesto
  - target: 8
    kind: relatesto
  - target: 9
    kind: relatesto
---

# 2. Codify style policy as mechanical gates, not prose

Date: 2026-10-14

## Status

Proposed

## Context

`AGENTS.md` and `agents/*.md` state quality gates as fact. An audit on
2026-10-13 (see `docs/tech-debt/mechanical-gates-audit.md`) measured each claim
against the working tree and found a clean split: rules backed by an
enforcer are at 100% compliance, rules backed only by prose have drifted.

| Policy as written                   | Enforcer                              | Measured                 |
| ----------------------------------- | ------------------------------------- | ------------------------ |
| Zero `any`                          | `no-explicit-any` (in `recommended`)  | 0 violations             |
| No `@ts-ignore`                     | `ban-ts-comment`                      | 0 violations             |
| Type checking clean                 | `astro check` in `npm run build`      | 0 errors, 0 warnings     |
| ESLint clean                        | `npm run lint` + pre-commit           | 0 violations             |
| Conventional commits                | commitlint `commit-msg` hook          | 100% of recent history   |
| `console.*` routed through `Logger` | none                                  | 0 in `src` (by choice)   |
| "100% unit test coverage"           | vitest thresholds at 80%              | 91.0% statements         |
| "Single quotes, no semicolons"      | none (Prettier defaults are opposite) | 1500:1 double:single     |
| "kebab-case file names"             | none                                  | every component violates |
| "No relative imports beyond `../`"  | none                                  | 13 violations            |
| "Prettier formatting"               | lint-staged on touched files only     | 3 files unformatted      |

The prose-only rows are where cost accumulates: an agent reading `AGENTS.md`
either follows a rule the codebase does not actually use, or has no way to know
which claims are real.

## Decision

Every style rule that can be expressed as a lint rule, a CI step, or a test
moves into one of those three. `AGENTS.md` becomes descriptive: it states the
rule, the command that proves it, and the ADR that chose it. A rule with no
enforcer is explicitly labelled advisory, and advisory is a real category, not
an insult (ADR 7).

The work is sequenced so that zero-violation gates land first as pure config
(no source edits), and rules that need source cleanup land one rule per PR.

## Consequences

- Prose that is wrong gets deleted rather than repeated, so `AGENTS.md` and
  `agents/code-quality-agent.md` need a correction pass.
- CI gains failure modes it has never had: repo-wide formatting, stylelint,
  prose at warning level.
- Counting violations becomes part of the workflow, because "how much cleanup"
  is the input to whether a rule can be gated.
- Risk of over-gating. Two measured candidates are deliberately kept advisory
  (ADR 7), and one large rule family (`recommendedTypeChecked`, 41 production
  violations) is deferred rather than absorbed into this effort.

## Alternatives considered

- **Keep prose, audit periodically.** Rejected: three documented rules are
  already false, and the drift was found by accident, not by the audit cycle.
- **Rewrite the docs to match reality and stop there.** Rejected: fixes the
  lie, not the regression. Nothing prevents the next file from drifting again.
- **Adopt a type-checked ruleset wholesale (`recommendedTypeChecked`).**
  Rejected for now: 76 violations measured (41 in production code), spread across
  test fixtures and app code, with no isolation per rule. Violates the
  "one decision, one revert" boundary; tracked as MG-012 instead.
