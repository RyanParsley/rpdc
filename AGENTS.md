# Agent Guidelines for RyanParsleyDotCom

## Overview

This project uses specialized sub-agents to maintain consistent quality across different aspects of development. Each agent has focused responsibilities and detailed guidelines.

## Agent Communication Guidelines

- Be direct and concise
- Avoid unnecessary flattery or overly enthusiastic language
- Focus on technical accuracy over emotional engagement
- Use straightforward language without excessive emojis or exclamations

## Sub-Agent Directory

| Agent                                  | Purpose                                       | File                                                                                     |
| -------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 🎨 **Writing Style Agent**             | Maintain consistent blog post voice and tone  | [`agents/writing-style-agent.md`](agents/writing-style-agent.md)                         |
| 🔧 **TypeScript Pedant Agent**         | Enforce strict TypeScript practices           | [`agents/typescript-pedant-agent.md`](agents/typescript-pedant-agent.md)                 |
| 🚀 **Astro Expert Agent**              | Astro framework patterns and best practices   | [`agents/astro-expert-agent.md`](agents/astro-expert-agent.md)                           |
| 🧪 **Testing Stickler Agent**          | Comprehensive testing standards               | [`agents/testing-stickler-agent.md`](agents/testing-stickler-agent.md)                   |
| 💅 **Code Quality Agent**              | Code style, formatting, naming conventions    | [`agents/code-quality-agent.md`](agents/code-quality-agent.md)                           |
| ⚙️ **Build & DevOps Agent**            | Build processes, deployment, git standards    | [`agents/build-devops-agent.md`](agents/build-devops-agent.md)                           |
| ⚡ **JavaScript Best Practices Agent** | Modern JS patterns and functional programming | [`agents/javascript-best-practices-agent.md`](agents/javascript-best-practices-agent.md) |
| 📡 **POSSE Integration Agent**         | POSSE syndication implementation              | [`agents/posse-integration-agent.md`](agents/posse-integration-agent.md)                 |

## Quick Agent Selection Guide

- **Writing blog posts** → Writing Style Agent
- **TypeScript code** → TypeScript Pedant Agent
- **Astro components/integrations** → Astro Expert Agent
- **Test files** → Testing Stickler Agent
- **Code formatting/style** → Code Quality Agent
- **Build/deployment** → Build & DevOps Agent
- **Utility functions** → JavaScript Best Practices Agent
- **POSSE features** → POSSE Integration Agent

## Quality Gates

All code changes must pass:

- **TypeScript compilation** with zero errors
- **ESLint** with zero violations
- **Prettier** formatting
- **Unit tests** with 100% coverage
- **Integration tests** for critical paths

## Commit Standards

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Include scope when relevant: `feat(posse): add bluesky support`
- Keep commit messages descriptive but concise
- Reference issues when applicable

## Review Process

All changes require review from relevant sub-agents:

- Writing changes → Writing Style Agent
- TypeScript changes → TypeScript Pedant Agent
- Astro changes → Astro Expert Agent
- Tests → Testing Stickler Agent

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

### Component Best Practices

- Use TypeScript interfaces for component props
- Declare global types in component frontmatter
- Import CSS in component frontmatter
- Use `Astro.props` for prop destructuring

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

## Build/Lint/Test Commands

- **Build**: `npm run build` (includes type checking)
- **Dev server**: `npm run dev`
- **Lint**: `npm run lint` (ESLint on src/)
- **Style lint**: `npm run lint:style` (Stylelint on CSS/Astro)
- **Format**: `npm run format` (Prettier on multiple file types)
- **Preview**: `npm run preview`
- **Type check**: `npx astro check`

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
