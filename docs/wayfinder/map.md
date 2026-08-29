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
- **Gate every change:** `npx astro check`, `npm run lint`, `npm run test:run` (now 241 passing)
- **Tickets:** GitHub Issues #247–#254 (repo `RyanParsley/rpdc`), labeled `enhancement`

## Ready to execute (no open decision)

- 🔄 **[TQ-001 / #247](https://github.com/RyanParsley/rpdc/issues/247)** Consolidate image-processing into `src/integrations/image.ts` — highest value, mostly mechanical.
  - **PR open: #255** — `image.ts` owns all 8 helpers + shared types; `posse.ts`, `posse-mastodon.ts`, `posse-bluesky.ts` import from it; `posse.ts` re-exports to keep its public surface. `astro check` clean, 241 tests, −549 duplicated lines.
  - The Mastodon image-upload path now has contract tests grounded in the [Mastodon API docs](https://docs.joinmastodon.org/api/): `POST /api/v1/media` → returned `id` threaded into `media_ids` on `POST /api/v1/statuses`; alt text as the `description` part; over-8MB skip. +3 tests.
- [ ] **[TQ-003 / #249](https://github.com/RyanParsley/rpdc/issues/249)** Fix MSW handler shadowing in shared mock arrays
- [ ] **[TQ-004 / #250](https://github.com/RyanParsley/rpdc/issues/250)** Route `console.*` through the logger; drop build-time `~/.env` read; `getMimeType` + `canonicalUrl` fail loudly
- [ ] **[TQ-007 / #253](https://github.com/RyanParsley/rpdc/issues/253)** Lint & typecheck `scripts/` (config block already exists, never invoked)
- [ ] **[TQ-008 / #254](https://github.com/RyanParsley/rpdc/issues/254)** Cleanup pass (vestigial null checks, dup comment, `ImageGallery` error)

## Needs your decision (grilling)

- [ ] **[TQ-002 / #248](https://github.com/RyanParsley/rpdc/issues/248)** Type source of truth — **rec: A** `src/types/*` authoritative, delete dead copies in `posse.ts`
- [ ] **[TQ-005 / #251](https://github.com/RyanParsley/rpdc/issues/251)** `send-digest` frontmatter — **rec: A** lift to typechecked TS + `gray-matter`/Zod (ties into #253)
- [ ] **[TQ-006 / #252](https://github.com/RyanParsley/rpdc/issues/252)** Coverage threshold — **rec:** start non-blocking at 50%, then ratchet to 80% after backfill

## Out of scope

- Rewriting the POSSE orchestration flow end-to-end
- New syndication platforms
- Migrating `pesos-mastodon.js` / `new-content.js` to TS (fold in only if #251 touches them)
- Changing any generated HTML / build output
