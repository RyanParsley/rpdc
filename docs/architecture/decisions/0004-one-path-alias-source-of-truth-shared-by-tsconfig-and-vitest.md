---
number: 4
title: One path-alias source of truth, shared by tsconfig and Vitest
date: 2026-10-14
status: accepted
tags:
- paths
- typescript
- config
links:
- target: 2
  kind: relatesto
- target: 8
  kind: relatesto
---

# 4. One path-alias source of truth, shared by tsconfig and Vitest

Date: 2026-10-14

## Status

Proposed

## Context

Two files declare aliases, and they do not agree.

| Alias           | `tsconfig.json` | `vitest.config.ts` | Used in `src/**` |
| --------------- | --------------- | ------------------ | ---------------- |
| `@components/*` | yes             | yes                | 40 imports       |
| `@layouts/*`    | yes             | yes                | 18 imports       |
| `@data/*`       | yes             | no                 | 0                |
| `@/*`           | no              | yes                | 0                |
| `@utils/*`      | no              | yes                | 0                |
| `@integrations/*` | no            | yes                | 0                |

Astro sets `resolve.tsconfigPaths: true` in its Vite pipeline
(`astro/dist/core/create-vite.js:209`), so **`tsconfig.json` `compilerOptions.paths`
is what actually resolves imports in the app**, for both `astro dev` and
`astro build`. `vitest.config.ts` maintains a separate list for the test
runtime.

The gap is latent, not live: `@utils`, `@integrations` and `@` resolve in tests
but not in application code, so the first person to write `import ... from
"@utils/date"` in a page gets a working test and a failing build. Meanwhile the
documented rule "no relative imports beyond `../`" has 13 violations, all of the
same shape, because pages that need a `src`-root module have no alias to use:

```
src/pages/blog/[...page].astro:            ../../../content.config
src/pages/note/tag/index.astro:            ../../../content.config
```

## Decision

`tsconfig.json` `compilerOptions.paths` is the single alias list, because it is
the one Astro resolves. Extend it to cover the whole of `src`:

```json
"@/*": ["src/*"],
"@data/*": ["data/*"],
"@components/*": ["src/components/*"],
"@layouts/*": ["src/layouts/*"],
"@utils/*": ["src/utils/*"],
"@integrations/*": ["src/integrations/*"]
```

`vitest.config.ts` derives its aliases from the same list instead of restating
it, and a convention test asserts the two stay equal (ADR 8). ESLint's
`no-restricted-imports` forbids `../../..` so the alias is the only short path
out of a nested directory.

## Consequences

- 13 deep relative imports become `@/content.config` style imports, in one
  mechanical pass.
- `astro check` and the test runtime stop disagreeing about what resolves.
- Adding an alias becomes a one-file edit with a test that fails if the mirror
  drifts.
- Dead aliases (`@data`) are either used or removed rather than silently present.

## Alternatives considered

- **Keep both lists and hand-sync them.** Rejected: that is the status quo, and
  it already diverged three ways.
- **Drop aliases, use relative imports everywhere.** Rejected: 58 existing
  aliased imports would be rewritten, and `../../../` is the pattern we are
  trying to gate away from.
- **Add `vite-tsconfig-paths` to keep Vitest in sync.** Rejected: Vite now
  resolves tsconfig paths natively (Vite 8 warns when the plugin is present),
  and a dependency to mirror a file we already own is the wrong shape of fix.
