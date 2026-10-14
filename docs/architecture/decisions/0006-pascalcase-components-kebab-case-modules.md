---
number: 6
title: PascalCase components, kebab-case modules
date: 2026-10-14
status: accepted
tags:
- naming
- convention
links:
- target: 2
  kind: relatesto
- target: 8
  kind: relatesto
---

# 6. PascalCase components, kebab-case modules

Date: 2026-10-14

## Status

Accepted

## Context

Two documents conflict with the tree and with each other. `AGENTS.md` says
"PascalCase for components and types" and "kebab-case for file names" in
adjacent bullets; `agents/code-quality-agent.md` says "kebab-case: File names,
directories" without qualification.

Measured naming in `src`:

| Location                            | Actual case                  | Claim         |
| ----------------------------------- | ---------------------------- | ------------- |
| `src/components/*.astro`            | PascalCase (`Backlinks.astro`) | kebab-case    |
| `src/components/*.test.ts`          | PascalCase (`YoutubeEmbed.test.ts`) | kebab-case |
| `src/layouts/*.astro`               | PascalCase                   | kebab-case    |
| `src/utils/*.ts`                    | kebab-case (`backlinks.ts`)  | kebab-case    |
| `src/integrations/*.ts`             | kebab-case (`posse-mastodon.ts`) | kebab-case |
| `src/types/*.ts`                    | kebab-case (`api.ts`)        | kebab-case    |
| `src/content/**` slugs              | free-form (`OpenWebUI.md`, `CodebergPagesCI.md`) | kebab-case |

So the prose is not wrong so much as under-specified: the convention is real,
it is just per-directory, and no tool expresses it.

## Decision

Record the convention the codebase actually follows, and gate it as a test
rather than a rename:

- `src/components` and `src/layouts`: `.astro` files are PascalCase, matching
  the component they export.
- `src/utils`, `src/integrations`, `src/types`, `src/integrations/*`: kebab-case
  for multi-word modules.
- `src/content/**`: exempt. Those filenames become URLs and product decisions,
  not code style.

Enforcement lives in a Vitest convention test (ADR 8), because a single ESLint
filename rule cannot express different cases per directory without a stack of
overrides.

## Consequences

- `agents/code-quality-agent.md` and `AGENTS.md` get one accurate naming rule
  instead of two contradictory halves.
- New components are unambiguous about filename shape.
- Zero file renames, so zero import churn and zero URL changes.
- The content-slug exemption needs to stay written down, or it reads as an
  oversight rather than a boundary.

## Alternatives considered

- **Rename components to kebab-case to match the docs.** Rejected: import churn
  across 58 aliased component imports, plus `.astro` component names are tied to
  the exported identifier and to Astro tooling conventions. Cost with no gain.
- **`eslint-plugin-unicorn` `filename-case`.** Rejected: it cannot scope per-directory
  case policies cleanly, and it adds a dependency to express a five-line test.
- **Drop `src/content` from the policy silently.** Rejected: an undocumented
  exemption gets "fixed" by someone later, which changes published URLs.
