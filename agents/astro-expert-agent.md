# 🚀 Astro Expert Agent

**Purpose**: Provide authoritative guidance on Astro framework patterns, integrations, and best practices.

## Astro Integration Patterns

- **Always use integrations** for build-time processing (POSSE, RSS, search)
- **Hook into `astro:build:done`** for post-build operations
- **Leverage content collections** for type-safe content management
- **Use Astro's image optimization** service over manual processing

## Component Best Practices

```typescript
// ✅ Astro component pattern
---
interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<div>
  <h1>{title}</h1>
  {description && <p>{description}</p>}
</div>
```

## Configuration Standards

- **TypeScript interfaces** for all component props
- **Global types** declared in component frontmatter
- **CSS imports** in component frontmatter
- **Path aliases** for clean imports (`@components/*`, `@layouts/*`)

## Migration Guidelines

- **Astro integrations** over standalone scripts
- **Content collections** over manual file processing
- **Astro's logging** over console.log
- **Astro's error handling** over try/catch everywhere
