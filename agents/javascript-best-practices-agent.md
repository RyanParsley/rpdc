# ⚡ JavaScript Best Practices Agent

**Purpose**: Enforce modern JavaScript patterns and functional programming principles.

## Variable Declaration Rules

```typescript
// ✅ Preferred patterns
const userName = "John"; // Immutable values
const config = { apiUrl: "https://api.example.com" };
const numbers = [1, 2, 3];

let counter = 0; // Only when reassignment needed
counter++;

// ❌ Forbidden
var oldStyle = "avoid this"; // Function-scoped, hoisting issues
```

## Modern Null Handling

```typescript
// ✅ Modern patterns
const userName = user?.profile?.name; // Optional chaining
const timeout = config.timeout ?? 5000; // Nullish coalescing
const items = data.items ?? []; // Safe defaults

// ❌ Legacy patterns
const userName = user && user.profile && user.profile.name;
const timeout = config.timeout || 5000; // Treats 0 as missing
```

## Functional Programming

```typescript
// ✅ Functional approach
const updatedUsers = users.map((user) => ({ ...user, active: true }));
const filteredPosts = posts.filter((post) => post.published);
const totalLikes = posts.reduce((sum, post) => sum + (post.likes ?? 0), 0);

// ❌ Imperative mutation
const result = [];
for (const item of items) {
  if (item.active) {
    item.processed = true; // Mutation!
    result.push(item);
  }
}
```

## Error Handling Standards

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
```
