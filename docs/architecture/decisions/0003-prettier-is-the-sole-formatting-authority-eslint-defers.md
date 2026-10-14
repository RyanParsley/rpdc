---
number: 3
title: Prettier is the sole formatting authority; ESLint defers
date: 2026-10-14
status: accepted
tags:
- formatting
- prettier
- ci
links:
- target: 2
  kind: relatesto
---

# 3. Prettier is the sole formatting authority; ESLint defers

Date: 2026-10-14

## Status

Accepted

## Context

`.prettierrc.cjs` configures exactly one thing: the Astro parser plugin.
Everything else about formatting is Prettier defaults plus `.editorconfig`
(`indent_style = tab`), which Prettier reads. The codebase reflects that:
1,500 double-quoted string literals against 1 single-quoted, 1,790
semicolon-terminated lines in `src/**`, tab indentation throughout.

`AGENTS.md` and `agents/code-quality-agent.md` claim the opposite ("single
quotes", "no semicolons", "2-space indentation"). Those claims have no
enforcer, so they are simply false.

Enforcement is also asymmetric. `lint-staged` formats whatever a commit touches,
so formatting is enforced at the edit boundary and never repo-wide.
`eslint-config-prettier` is in `devDependencies` and referenced by no config,
so nothing currently prevents an ESLint stylistic rule from fighting Prettier.
Three files fail `prettier --check` today: `src/content.config.ts`,
`.github/workflows/weekly-digest.yml`, and `public/stormtrooperbear/stormtrooper_bear.js`.

## Decision

Prettier config plus `.editorconfig` is the only definition of formatting in
this repo. Concretely:

- Append `eslint-config-prettier` (already installed) as the last entry in
  `eslint.config.mjs` so ESLint can never hold an opinion about format.
- Add `format:check` (`prettier --check`) and run it in CI. `npm run format`
  stays as the fixer.
- Exclude generated and vendored public assets via `.prettierignore` instead of
  reformatting them. `public/stormtrooperbear/stormtrooper_bear.js` is an asset,
  not source.
- Correct the style section of `AGENTS.md` to state tabs, double quotes,
  semicolons.

## Consequences

- Formatting can fail CI for the first time, which is why the three files must
  land in the same PR as the gate.
- `lint-staged`'s "format only what you touch" behaviour stops being load-bearing;
  it becomes a convenience rather than the only line of defence.
- Docs no longer describe a style the repo does not have, so agents stop being
  invited to write single-quoted code.

## Alternatives considered

- **Flip Prettier to `singleQuote: true, semi: false` to match the docs.**
  Rejected: rewrites essentially every line of source for zero functional
  benefit, and the docs' claim ("no semicolons (Prettier default)") is factually
  wrong about Prettier, so it is not a preference worth adopting.
- **Leave formatting to commit-time lint-staged only.** Rejected: that is the
  current state, and it produced the three drifted files.
- **Encode formatting in ESLint rules instead.** Rejected: two tools deciding
  line width and quotes is a permanent conflict generator.
