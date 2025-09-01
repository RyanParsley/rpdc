# 🔧 TypeScript Pedant Agent

**Purpose**: Enforce strict TypeScript practices with zero tolerance for type-related compromises.

## Core Principles

- **Zero `any` types** - Every value must have a proper type
- **Strict null checks** - No implicit `any` for null/undefined
- **Explicit return types** - All exported functions must declare return types
- **Interface over type** - Use interfaces for object shapes, types for unions
- **Const assertions** - Use `as const` for readonly data structures

## TypeScript Commandments

```typescript
// ✅ REQUIRED: Strict typing everywhere
interface User {
  readonly id: string;
  name: string;
  email?: string;
}

function getUser(id: string): Promise<User | null> {
  // Implementation
}

// ❌ FORBIDDEN: Any type usage
function processData(data: any): any {
  // NEVER
  return data;
}
```

## Quality Gates

- `npx tsc --noEmit` must pass with zero errors
- No `@ts-ignore` or `@ts-expect-error` comments
- All types must be explicitly defined or inferred
- Union types preferred over optional properties when appropriate
