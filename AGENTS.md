# Agent Guidelines for RyanParsleyDotCom

## Build/Lint/Test Commands

- **Build**: `npm run build` (includes type checking)
- **Dev server**: `npm run dev`
- **Lint**: `npm run lint` (ESLint on src/)
- **Style lint**: `npm run lint:style` (Stylelint on CSS/Astro)
- **Format**: `npm run format` (Prettier on multiple file types)
- **Preview**: `npm run preview`
- **Type check**: `npx astro check`

## Agent Communication Guidelines

- Be direct and concise
- Avoid unnecessary flattery or overly enthusiastic language
- Focus on technical accuracy over emotional engagement
- Use straightforward language without excessive emojis or exclamations

## Code Style Guidelines

### TypeScript

- Use strictest Astro TSConfig with strict null checks
- Define interfaces/types at file top
- Use explicit return types for exported functions
- Prefer `const` assertions for readonly data

### Imports & Paths

- Use path aliases: `@components/*`, `@layouts/*`, `@data/*`
- Group imports: external libs, then internal components
- No relative imports beyond `../`

### Formatting

- 2-space indentation (EditorConfig)
- Single quotes for strings
- No semicolons (Prettier default)
- Trailing commas in multiline structures

### Naming Conventions

- PascalCase for components and types
- camelCase for variables/functions
- kebab-case for file names
- UPPER_SNAKE_CASE for constants

### Error Handling

- Use try/catch for async operations
- Throw descriptive Error objects
- Handle null/undefined with optional chaining

### Astro Specific

- Use TypeScript interfaces for component props
- Declare global types in component frontmatter
- Import CSS in component frontmatter
- Use `Astro.props` for prop destructuring

### Git

- Conventional commits (enforced by commitlint)
- Pre-commit hooks run linting/formatting
- Use descriptive commit messages

### Testing

- Playwright installed for E2E testing
- Vitest configured for unit testing with TypeScript support
- Comprehensive test coverage for POSSE integration
- 100% type safety with no `any` types in application code

### TypeScript Configuration

- **Config file**: `tsconfig.json` extends `"astro/tsconfigs/strictest"`
- **Strict mode**: Enabled by default (includes `noImplicitAny: true`)
- **No `any` types**: Strictly enforced - replace with proper types
- **Null checks**: `strictNullChecks: true` enabled
- **Build verification**: `npm run build` includes type checking

## JavaScript/TypeScript Best Practices

### Variable Declarations & Immutability

**Prefer `const` for immutability, use `let` only when reassignment is necessary, avoid `var` entirely.**

```typescript
// ✅ Preferred: const for immutable values
const userName = "John";
const config = { apiUrl: "https://api.example.com" };
const numbers = [1, 2, 3];

// ✅ Use let only when reassignment is needed
let counter = 0;
counter++; // This is the only place it changes

// ❌ Avoid var (function-scoped, hoisting issues)
var oldStyle = "avoid this";

// ✅ Functional approach over mutation
const updatedConfig = { ...config, timeout: 5000 };
const newNumbers = [...numbers, 4];
```

### Modern Null Checking Patterns

**Use optional chaining (`?.`) and nullish coalescing (`??`) instead of verbose `&&` patterns.**

#### Optional Chaining (`?.`)

```typescript
// ✅ Modern: Safe property access
const userName = user?.profile?.name;
const hasItems = cart?.items?.length > 0;
if (image?.src) {
  /* handle image */
}

// ❌ Verbose: Manual null checking
const userName = user && user.profile && user.profile.name;
const hasItems = cart && cart.items && cart.items.length > 0;
if (image && image.src) {
  /* handle image */
}
```

#### Nullish Coalescing (`??`)

```typescript
// ✅ Modern: Only replaces null/undefined
const timeout = config.timeout ?? 5000;
const items = data.items ?? [];
const displayName = user.name ?? "Anonymous";

// ❌ Logical OR treats falsy values as missing
const timeout = config.timeout || 5000; // Wrong: treats 0 as missing
const items = data.items || []; // Wrong: treats [] as missing
const displayName = user.name || "Anonymous"; // Wrong: treats "" as missing
```

#### Key Differences: `||` vs `??`

| Operator | Replaces                                                   | Use Case                                                |
| -------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `\|\|`   | All falsy values (`0`, `""`, `false`, `null`, `undefined`) | When empty strings/zeros should be treated as "missing" |
| `??`     | Only `null` and `undefined`                                | When you want to preserve valid falsy values            |

```typescript
// Examples of correct usage
const port = config.port ?? 3000; // ✅ Preserves port 0
const name = user.name ?? "Guest"; // ✅ Preserves empty string names
const items = data.items ?? []; // ✅ Preserves empty arrays

const fallback = value || "default"; // ✅ Treats "" as missing
const count = num || 0; // ✅ Treats 0 as missing (weird but valid)
```

### Error Handling

**Use type guards for better error handling and TypeScript inference.**

```typescript
// ✅ Type-safe error handling
try {
  const result = await apiCall();
  return result;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`API call failed: ${message}`);
  throw error;
}

// ✅ Type guards for better inference
function isApiError(
  error: unknown,
): error is { code: number; message: string } {
  return typeof error === "object" && error !== null && "code" in error;
}
```

### Functional Programming Patterns

**Prefer functional approaches over imperative mutations when possible.**

```typescript
// ✅ Functional: Immutable transformations
const updatedUsers = users.map((user) => ({ ...user, active: true }));
const filteredPosts = posts.filter((post) => post.published);
const totalLikes = posts.reduce((sum, post) => sum + (post.likes ?? 0), 0);

// ✅ Pure functions over side effects
const formatUser = (user: User) => `${user.firstName} ${user.lastName}`;
const validateEmail = (email: string) => email.includes("@");

// ❌ Avoid: Mutation-heavy imperative code
const result = [];
for (const item of items) {
  if (item.active) {
    item.processed = true; // Mutation!
    result.push(item);
  }
}
```

## Astro Integration Patterns

### Preferred Approach for Build-Time Processing

**For features that need to run during the build process (POSSE, RSS generation, search indexing, etc.), always use Astro integrations instead of standalone scripts.**

#### ✅ Recommended: Astro Integration

```typescript
// src/integrations/feature-name.ts
import type { AstroIntegration } from "astro";

export default function featureIntegration(options): AstroIntegration {
  return {
    name: "feature-name",
    hooks: {
      "astro:build:done": async ({ logger }) => {
        logger.info("Feature: Processing...");
        // Implementation here
      },
    },
  };
}

// astro.config.mjs
integrations: [
  featureIntegration({
    /* options */
  }),
];
```

#### ❌ Avoid: Standalone Scripts

```bash
# .cloudcannon/postbuild
node scripts/feature-script.js
```

#### Benefits of Astro Integrations

- ✅ **Native integration** with Astro's build pipeline
- ✅ **Type safety** with full TypeScript support
- ✅ **Configuration** through astro.config.mjs
- ✅ **Error handling** integrated with Astro's system
- ✅ **Logging** using Astro's structured logger
- ✅ **Access to build artifacts** and content collections
- ✅ **Better debugging** in development
- ✅ **Consistent with Astro ecosystem**

#### When to Use Standalone Scripts

- Only when Astro integration is not feasible
- Legacy systems requiring specific Node.js versions
- Third-party tools not compatible with Astro's build process

### POSSE Implementation Example

The POSSE syndication feature should be implemented as an Astro integration that:

- Uses `astro:build:done` hook for automatic execution
- Leverages Astro's content collection APIs
- Uses Astro's image optimization service
- Integrates with Astro's logging system
- Configured through astro.config.mjs

## Migration from CloudCannon Postbuild Hook

**✅ RECOMMENDED: Use Astro Integration + Postbuild Hook (Current Setup)**

The current setup combines the best of both worlds:

1. **Astro Integration**: Handles the actual POSSE syndication during build
2. **Postbuild Hook**: Commits syndication changes back to GitHub

### Benefits of Current Setup

- **Better Integration**: Runs during the build process with full access to Astro's ecosystem
- **Type Safety**: Full TypeScript support with proper error handling
- **Consistency**: Uses the same logging and configuration system as your Astro site
- **Persistence**: Changes are committed back to GitHub for long-term storage
- **Reliability**: Integrated error handling that won't break the build

### Postbuild Hook Details

The `.cloudcannon/postbuild` script:

- Checks for changes in `src/content/ephemera/`
- Commits POSSE updates with message: `"POSSE: Update syndication links [skip ci]"`
- Pushes changes back to GitHub
- Handles errors gracefully without breaking the build

**❌ DEPRECATED: Old Standalone Script**

The old CloudCannon postbuild hook (`scripts/syndicate-ephemera.js`) has been disabled. While it provided similar functionality, it had several drawbacks:

- **Separate Dependencies**: Required managing additional Node.js dependencies
- **Build Complexity**: Added extra steps to the deployment process
- **Limited Integration**: No access to Astro's build context or logging
- **Maintenance Overhead**: Duplicate code and configuration

**Migration Status:**

1. ✅ **Done**: Astro integration is configured and working
2. ✅ **Done**: New postbuild hook commits changes back to GitHub
3. 🔄 **Optional**: Remove the old files when you're confident the new setup works:
   ```bash
   rm scripts/syndicate-ephemera.js
   # Keep .cloudcannon/postbuild - it's now active and needed
   ```

## POSSE Syndication Integration

The POSSE (Publish on your Own Site, Syndicate Elsewhere) integration automatically syndicates ephemera posts to social media platforms during the Astro build process.

### Features

- **Automatic Discovery**: Scans `src/content/ephemera/` for recent posts (last 24 hours)
- **Smart Filtering**: Only processes posts that haven't been syndicated yet
- **Multi-Platform Support**: Currently supports Mastodon and Bluesky
- **Image Handling**: Uploads images from ephemera posts to social platforms
- **Content Processing**: Cleans markdown content for social media consumption
- **Rate Limiting**: Prevents spam with configurable delays between posts
- **Dry-Run Mode**: Test syndication without actually posting
- **Error Resilience**: Continues processing even if individual posts fail

### Configuration

Add to `astro.config.mjs`:

```typescript
import posseIntegration from "./src/integrations/posse";

export default defineConfig({
  integrations: [
    posseIntegration({
      mastodon: {
        token: process.env.MASTODON_TOKEN,
        instance: "mastodon.social",
      },
      bluesky: {
        username: process.env.BLUESKY_USERNAME,
        password: process.env.BLUESKY_PASSWORD,
      },
      dryRun: false, // Set to true for testing
      maxPosts: 3, // Limit posts per build
    }),
  ],
});
```

### Environment Variables

Set these environment variables for production:

```bash
MASTODON_TOKEN=your_mastodon_access_token
MASTODON_INSTANCE=your.mastodon.instance
BLUESKY_USERNAME=your.bluesky.handle
BLUESKY_PASSWORD=your_bluesky_app_password
```

### Ephemera Post Format

Posts in `src/content/ephemera/` should follow this frontmatter format:

```yaml
---
title: "My Ephemera Post"
date: 2024-08-31
image:
  src: "/path/to/image.jpg"
  alt: "Alt text for accessibility"
---
Post content in markdown format...
```

### Platform-Specific Limits

- **Mastodon**: 400 characters, supports images
- **Bluesky**: 280 characters, supports images

### Build Integration

The integration runs automatically during `npm run build` and:

1. Scans for recent ephemera posts
2. Filters out already syndicated content
3. Processes content for each platform
4. Uploads images if present
5. Posts to configured platforms
6. Updates original posts with syndication URLs
7. Logs all activity for monitoring

### Error Handling

- Individual post failures don't stop the entire process
- Network timeouts are handled gracefully
- Invalid image formats are logged and skipped
- Authentication failures are clearly reported

### Testing

Use dry-run mode for testing:

```typescript
posseIntegration({
  dryRun: true,
  maxPosts: 1,
});
```

This will log what would be posted without actually sending to platforms.
