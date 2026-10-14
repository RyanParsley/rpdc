---
number: 9
title: Explicit types at boundaries, inferred inside
date: 2026-10-14
status: accepted
tags:
- typescript
- convention
- style
links:
- target: 7
  kind: amends
- target: 2
  kind: relates to
- target: 4
  kind: relates to
- target: 7
  kind: amends
- target: 2
  kind: relatesto
- target: 4
  kind: relatesto
---

# 9. Explicit types at boundaries, inferred inside

Date: 2026-10-14

## Status

Accepted

## Context

`AGENTS.md` says "Use explicit return types for exported functions." ADR 7 put
`explicit-function-return-type` on the advisory pile because the rule cannot see
export scope. That was the right call about the tool and the wrong call about the
policy, because the policy was never the thing worth enforcing.

The calibration is Rust's, which has already solved "where does a type have to be
written down." Rust is not "annotate everything":

| Rust construct | Rust rule | Reason |
| --- | --- | --- |
| `fn` item, `pub` or private | Signature mandatory, no inference | A `fn` is a contract. The compiler will not let a callable's type escape into the crate unnamed |
| `impl Trait for X` | Types **may be omitted**, copied from the trait | Restating a signature the trait fixed adds nothing and can drift |
| Closures | Fully inferred. Annotation is legal and never written | A closure's type is decided by its call site |
| `let` bindings | Inferred unless pinning a surprising type | `let x: u32 = 5` is noise |
| `Result<T, E>` | `E` must be named | Callers branch on it |
| Public API review | `missing_docs` gates at the crate boundary; `cargo public-api` and `cargo interface` print resolved types | Rust answers "can a human read the boundary" with a tool, not with redundant annotations |

One principle, applied in both directions: **write a type where it crosses a
boundary, stay silent where a checker already knows it.**

Measured against this repo, the 14 production sites named by
`explicit-function-return-type` are not one kind of thing:

| Count | Shape | Rust equivalent | Verdict |
| --- | --- | --- | --- |
| 8 | `export async function getStaticPaths()` in `src/pages/**` | Trait impl signature | Omit |
| 3 | `const getFullPath`, `tagCount`, `formatDate` in `.astro` | Closure | Omit |
| 1 | `export const dateTransformer` in `src/integrations/ephemera-schema.ts:10` | `pub fn` | Annotate |
| 1 | `function scanDirectory` (recursive) in `src/integrations/posse.ts:194` | Private `fn` item | Annotate |
| 1 | `export const computeCounts` in `src/utils/webmentions.ts:137` | `pub fn` returning an object literal | Annotate |

The third annotation is the one that justifies the rule. `computeCounts` returns
an object literal, so the type callers depend on exists nowhere in source.
TypeScript knows it. A reader cannot see it. Astro projects emit no `.d.ts`, so
there is no `cargo interface` equivalent to fall back on, which makes the
signature the only place the contract is written down.

## Decision

1. **Explicit at module boundaries.** Exported functions in `src/integrations`,
   `src/utils`, and `src/types` declare return types. Enforced by
   `explicit-function-return-type` with `allowExpressions: true`, scoped by
   `files:` glob in `eslint.config.mjs`.
2. **Omit framework-dictated signatures.** `getStaticPaths`, Astro component
   props, and integration hook callbacks take their types from Astro. Restating
   them creates a second copy of a contract the framework owns.
3. **Omit closures and body locals.** `.astro` frontmatter helpers, callbacks,
   and every `let`. This is the same rule that says `let count = 0`, not
   `let count: number = 0`.
4. **Annotate where inference cannot reach or is wrong.** Recursive functions,
   mutually recursive modules, and anything resolving `unknown` from a network or
   `catch` boundary. `res.json()` returns `any`, so
   `(await request.json()) as BlueskyAuthRequest` is a cast, not a type. The Rust
   move names the type at the boundary and lets the parse produce it.
5. **Delete restatements.** Rule 3 in the other direction. The 5 production
   `no-unnecessary-type-assertion` violations measured in the audit are
   annotations the checker already derives, and they come out rather than staying
   for comfort.

Landing cost: 3 return types, one `eslint.config.mjs` block, and the `AGENTS.md`
wording changing from "exported functions" to "functions in module-boundary
directories, excluding framework-dictated signatures".

## Consequences

- The gate is real instead of advisory, because the two exemptions that a file
  glob cannot express (framework signatures, template helpers) move into the
  documentation and the config comment instead of into an eslint-disable.
- Rules 4 and 5 pre-decide two arguments the type-checked epic would otherwise
  re-litigate: the `.json()` casts in `posse-bluesky.ts` and
  `posse-mastodon.ts`, and the 5 unnecessary assertions.
- `AGENTS.md` gains a policy that is precise enough to check, which was the
  standard ADR 2 set.
- Exemptions are documented, not incidental. If a `getStaticPaths` ever appears
  inside a util module, rule 1 flags it, and that is a useful complaint about
  file layout rather than a false positive.
- A divergence from Rust is written down rather than hidden: Rust requires
  signatures on private `fn` items in every module. `.astro` frontmatter is
  excluded here because it runs in script scope at render time, which puts its
  private helpers closer to closures in a function body than to items in a
  module.

## Alternatives considered

- **ADR 7's advisory position, kept.** Rejected: it treated "the rule cannot see
  export scope" as the end of the discussion. The rule does not need to see
  export scope. It needs to see the directories where exports are the API.
- **Gate everywhere (option a, 14 edits).** Rejected: 11 of the 14 are framework
  signatures or template closures, the two categories Rust deliberately exempts.
- **Custom rule that understands export scope.** Rejected: the precise policy
  costs a dependency or a hand-maintained rule, and the sites it would newly
  catch are the ones worth the least.
- **Adopt Rust strictly, private `fn` included, no glob exemptions.** Rejected:
  it forces annotations onto Astro templates that have no module semantics, which
  is restating what a checker knows. Rule 2 forbids that.
