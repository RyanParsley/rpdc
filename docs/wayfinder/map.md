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
- **Gate every change:** `npx astro check`, `npm run lint`, `npm run test:run` (now 282 passing)
- **Tickets:** GitHub Issues #247–#254 (repo `RyanParsley/rpdc`), labeled `enhancement`

## Done

- ✅ **[TQ-001 / #247](https://github.com/RyanParsley/rpdc/issues/247)** Image helpers consolidated into `src/integrations/image.ts` — merged via PR #255.
- ✅ **[TQ-006 / #252](https://github.com/RyanParsley/rpdc/issues/252)** Coverage thresholds enforced + integration backfill — closed via PR #262.
- ✅ **[TQ-007 / #253](https://github.com/RyanParsley/rpdc/issues/253)** + **[TQ-008 / #254](https://github.com/RyanParsley/rpdc/issues/254)** Scripts lint/typecheck + cleanup pass — closed via PR #261.
- ✅ **[TQ-002 / #248](https://github.com/RyanParsley/rpdc/issues/248)** Type source of truth — **decided B-plus (colocate)**, not the issue's rec A: `src/types/posse.ts` had zero importers and was wrong; the codebase's actual convention is colocation. Done on branch `refactor/posse-types`: dead type file deleted, `Logger` derived via `Pick<AstroIntegrationLogger, ...>`, `EphemeraData` derived via `z.infer` from the new shared `src/integrations/ephemera-schema.ts` (consumed by both `content.config.ts` and `posse.ts`), test-only types moved into `src/test/setup.ts`. Convention recorded in AGENTS.md.

## Ready to execute (no open decision)

- [ ] **[TQ-003 / #249](https://github.com/RyanParsley/rpdc/issues/249)** Fix MSW handler shadowing in shared mock arrays
- [ ] **[TQ-004 / #250](https://github.com/RyanParsley/rpdc/issues/250)** Route `console.*` through the logger; drop build-time `~/.env` read; `getMimeType` + `canonicalUrl` fail loudly
  - Note post-#248: `Logger` is `Pick<AstroIntegrationLogger, ...>` living in `posse.ts`. If `utils/webmentions.ts` needs it, extract it to a neutral home rather than importing utils → integrations.

## Needs your decision (grilling)

- [ ] **[TQ-005 / #251](https://github.com/RyanParsley/rpdc/issues/251)** `send-digest` frontmatter — **rec: A** lift to typechecked TS + `gray-matter`/Zod. Post-#248 pattern to reuse: shared Zod schema + `z.infer`, as done for ephemera.

## Deferred from #248

- Runtime import cycle: `generatePostContent` in `posse.ts` ↔ platform modules (type-half of the cycle is gone; moving the function is a separate refactor)
- Platform modules adopting `src/types/api.ts` wire types in place of their inline `BlueskyBlob`/`BlueskySession`/etc.

## Out of scope

- Rewriting the POSSE orchestration flow end-to-end
- New syndication platforms
- Migrating `pesos-mastodon.js` / `new-content.js` to TS (fold in only if #251 touches them)
- Changing any generated HTML / build output
