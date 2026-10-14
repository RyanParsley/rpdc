# 💅 Code Quality Agent

**Purpose**: maintain consistent code style, formatting, and naming conventions across the entire codebase.

## Formatting Standards

One authority. Prettier plus `.editorconfig`. `npm run format:check` proves it, `npm run format` fixes it. These values replaced an earlier list (2-space, single quotes, no semicolons) that described a style this repository never had, so treat the command as the source and this list as a summary of it (ADR 3).

- **Tab indentation**, display width 2 (`.editorconfig`: `indent_style = tab`, `indent_size = 2`)
- **Double quotes** for strings
- **Semicolons**
- **Trailing commas** in multiline structures
- **80-column** lines (Prettier default)
- **Stylelint** for CSS and `<style>` blocks in `.astro`: `npm run lint:style:check`
- **`eslint-config-prettier` stays last** in `eslint.config.mjs` so ESLint never competes on format

## Naming Conventions

Case depends on the directory (ADR 6). Nothing enforces this yet; #289 adds a Vitest convention test.

- **PascalCase**: components and layouts (`src/components/Backlinks.astro`, `src/layouts/Page.astro`), types and interfaces
- **camelCase**: variables, functions, methods
- **kebab-case**: modules in `src/utils`, `src/integrations`, `src/types` (`posse-mastodon.ts`, `ephemera-schema.ts`)
- **Exempt**: `src/content/**`, because those slugs are published URLs rather than code style
- **UPPER_SNAKE_CASE**: constants, environment variables

## Import Organization

Grouped external first, then internal. No enforcer exists yet, so this is a preference; #292 files the plugin decision.

```typescript
// ✅ Real aliases from this repo
import PostLink from "@components/PostLink.astro";
import { collectBacklinks } from "../utils/backlinks";

// ❌ Not resolvable in application code today: @utils, @integrations and @
// exist only in vitest.config.ts, so a test passes and `astro build` fails.
import { formatDate } from "@utils/date";
```

`@components/*` and `@layouts/*` are the live aliases. `@data/*` is declared in `tsconfig.json` with zero uses. #283 makes `tsconfig.json` the single list, which is what Astro resolves through `resolve.tsconfigPaths: true`.

## File Structure Standards

- **One component per file**
- **Types defined at file top**
- **Related utilities co-located**
- **Clear separation of concerns**
