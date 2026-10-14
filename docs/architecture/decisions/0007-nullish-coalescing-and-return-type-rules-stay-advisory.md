---
number: 7
title: Nullish-coalescing and return-type rules stay advisory
date: 2026-10-14
status: accepted
tags:
- eslint
- advisory
- typescript
links:
- target: 2
  kind: relatesto
- target: 9
  kind: amendedby
---

# 7. Nullish-coalescing and return-type rules stay advisory

Date: 2026-10-14

## Status

Accepted

## Context

Two rules that the style docs advocate look gate-able and are not, for
different reasons. Both were measured on 2026-10-13 with
`@typescript-eslint` 8.71 against `./src ./scripts`.

**`prefer-nullish-coalescing`: 13 production violations** (`src/integrations/posse.ts`,
`image.ts`, `gnuplot-charts.ts`, `src/layouts/Page.astro`, several `src/pages/**`).
The autofix rewrites `a || b` to `a ?? b`, which is not
behaviour-preserving: `||` also substitutes for `0`, `""`, `false`, and `NaN`.
`AGENTS.md` documents that exact trap in its own `||` vs `??` table. In this
codebase the sites are concentrated in POSSE payload and config plumbing, where
`{ status: "" }` or `maxPosts: 0` reaching the network layer instead of a
fallback is a live behavioural risk, not a style question.

**`explicit-function-return-type`: 14 production violations.** The stated policy
is narrower than the rule: "Use explicit return types for exported functions".
The rule has no exported-only mode, so gating it enforces annotations on every
inline closure in `.astro` templates and event handlers too. That is a different,
stricter policy that nobody chose.

## Decision

Both rules are configured at `warn`, never `error`, and the violation count is
recorded here so it can be driven down deliberately:

- `prefer-nullish-coalescing` is converted site by site, inside the feature PR
  that owns that site, by a human reading whether `0`/`""`/`false` are valid
  inputs. No bulk autofix, no autofix commit.
- `explicit-function-return-type` stays advisory until either the policy or the
  rule matches the other. If "exported functions only" is the real rule, that
  needs a plugin that can express export scope, not this one.

Warnings are allowed to be noisy; errors are allowed to block nothing else.
Keeping these two at `warn` is what lets the genuinely safe rules (ADR 2) be
hard gates without the whole gate set getting disabled out of frustration.

## Consequences

- Two documented preferences remain prose plus a warning, by choice, and the
  reason is written down instead of looking like an oversight.
- The 13 nullish sites are a countable backlog, visible in the audit doc.
- Someone who wants a hard gate on either must first propose the narrower rule
  that makes it safe.

## Alternatives considered

- **Autofix all 13 and gate at error.** Rejected: silent semantic change in
  syndication code paths, in a commit whose message can only claim "style".
- **Gate on changed lines only (lint-staged `--diff`)**. Deferred, not rejected:
  reasonable future shape, but it needs a working baseline first, so it is not a
  today decision.
- **Delete both rules.** Rejected: the warnings are how the remaining drift stays
  visible; deleting them converts a countable backlog into silence.

## Amendment (2026-10-14)

The `explicit-function-return-type` half of this decision is **still open**. The
claim above was verified rather than assumed. The rule's complete option set in
`@typescript-eslint` 8.71 is:

```
allowConciseArrowFunctionExpressionsStartingWithVoid
allowDirectConstAssertionInArrowFunctions
allowedNames
allowExpressions
allowFunctionsWithoutTypeParameters
allowHigherOrderFunctions
allowIIFEs
allowTypedFunctionExpressions
```

There is no export-scope option, so the rule cannot express "exported functions
only" symbol by symbol. It can, however, be scoped by **file glob** in flat
config, which approximates the policy: module-boundary directories are where an
export is the API surface.

Measured with the rule enabled on `src/integrations/**`, `src/utils/**`,
`src/types/**` only, production violations drop from 14 to **3**:

```
src/integrations/ephemera-schema.ts:10:74
src/integrations/posse.ts:194:2
src/utils/webmentions.ts:137:60
```

Remaining distribution: `src/pages` 9 (8 framework-dictated `getStaticPaths`,
1 template closure), `src/components` 2 closures, test files 11.

That makes a third path available (option **d** in MG-007): gate the rule on
module boundaries, leave `.astro` templates and pages exempt, and fix three
lines.

**Resolved 2026-10-14 by ADR 9.** Option (d) was chosen, and ADR 9's reasoning
supersedes this ADR's framing: the 11 exempt sites are exempt because they are
framework signatures and closures, which is where Rust itself permits omission,
not because a glob happened to skip them. This ADR keeps only the
`prefer-nullish-coalescing` decision, which still stands as written.
