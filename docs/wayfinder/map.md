---
labels: wayfinder:map
---

# Wayfinder Map: rpdc Code-Quality Pass

## Destination

A maintainable POSSE / integration layer with **no duplicated logic**, a
**single source of truth for types**, **testable logging & fetch paths**,
**linted + typechecked scripts**, and **enforced coverage**, without changing
any observable build output.

## Notes

- **Domain:** Astro 7 static site, POSSE (Mastodon + Bluesky) syndication, webmentions, scripts
- **Gate every change:** `npx astro check`, `npm run lint`, `npm run test:run` (now 286 passing)
- **Tickets:** GitHub Issues #247–#254 (repo `RyanParsley/rpdc`), labeled `enhancement`

## Done

- ✅ **[TQ-005 / #251](https://github.com/RyanParsley/rpdc/issues/251)** send-digest frontmatter — **decided B-plus**: `gray-matter` in place (not the rec-A TS module), plus `published:false` fix, `--dry-run`, and 20 unit tests (scripts/ added to the vitest include). Workflow keeps its `npm run build` step — under B it's the only schema gate. Also removed the hand-rolled `~/.env` loader from `pesos-mastodon.js` (the issue's claim it lived in send-digest.js was wrong).
- ✅ **[TQ-004 / #250](https://github.com/RyanParsley/rpdc/issues/250)** Logging/env hardening — PR: `fix/logging-env-hardening`. `Logger` extracted to `src/types/logger.ts` (neutral home; posse.ts re-exports); both `console.*` sites now take an optional logger; `Webmentions.astro` relies solely on `astro:env` (no more build-time `~/.env` read); `getMimeType` throws on unknown extensions; `canonicalUrl` strips only a trailing `.md`. **Local-dev note:** if your shell sources `~/.env` (this repo's documented dev flow), nothing changes — the token is already in the process env, which is where `astro:env` reads it. The removed fallback only ever fired for builds launched outside such a shell; for those, use the repo-root `.env` (gitignored) or direnv.
- ✅ **[TQ-003 / #249](https://github.com/RyanParsley/rpdc/issues/249)** MSW mock shadowing removed — PR: `fix/msw-handler-shadowing`. Finding: the shadowed handlers were never actually exercised (posse suites stub `global.fetch`; nothing sent `X-Mock-Error`), so this was preventive hygiene.
- ✅ **[TQ-001 / #247](https://github.com/RyanParsley/rpdc/issues/247)** Image helpers consolidated into `src/integrations/image.ts` — merged via PR #255.
- ✅ **[TQ-006 / #252](https://github.com/RyanParsley/rpdc/issues/252)** Coverage thresholds enforced + integration backfill — closed via PR #262.
- ✅ **[TQ-007 / #253](https://github.com/RyanParsley/rpdc/issues/253)** + **[TQ-008 / #254](https://github.com/RyanParsley/rpdc/issues/254)** Scripts lint/typecheck + cleanup pass — closed via PR #261.
- ✅ **[TQ-002 / #248](https://github.com/RyanParsley/rpdc/issues/248)** Type source of truth — **decided B-plus (colocate)**, not the issue's rec A: `src/types/posse.ts` had zero importers and was wrong; the codebase's actual convention is colocation. Done on branch `refactor/posse-types`: dead type file deleted, `Logger` derived via `Pick<AstroIntegrationLogger, ...>`, `EphemeraData` derived via `z.infer` from the new shared `src/integrations/ephemera-schema.ts` (consumed by both `content.config.ts` and `posse.ts`), test-only types moved into `src/test/setup.ts`. Convention recorded in AGENTS.md.

## Ready to execute (no open decision)

_(nothing — everything unblocked has shipped)_

## Needs your decision (grilling)

_(nothing — the backlog is clear)_

## Deferred from #248

- Runtime import cycle: `generatePostContent` in `posse.ts` ↔ platform modules (type-half of the cycle is gone; moving the function is a separate refactor)
- Platform modules adopting `src/types/api.ts` wire types in place of their inline `BlueskyBlob`/`BlueskySession`/etc.

## Out of scope

- Rewriting the POSSE orchestration flow end-to-end
- New syndication platforms
- Migrating `pesos-mastodon.js` / `new-content.js` to TS (fold in only if #251 touches them)
- Changing any generated HTML / build output
