# 💅 Code Quality Agent

**Purpose**: Maintain consistent code style, formatting, and naming conventions across the entire codebase.

## Formatting Standards

- **2-space indentation** (EditorConfig enforced)
- **Single quotes** for strings
- **No semicolons** (Prettier default)
- **Trailing commas** in multiline structures

## Naming Conventions

- **PascalCase**: Components, Types, Interfaces
- **camelCase**: Variables, functions, methods
- **kebab-case**: File names, directories
- **UPPER_SNAKE_CASE**: Constants, environment variables

## Import Organization

```typescript
// ✅ Correct import grouping
import { useState } from "react";
import type { AstroIntegration } from "astro";

import { Button } from "@components/Button";
import { formatDate } from "@utils/date";
import type { Post } from "@types/content";
```

## File Structure Standards

- **One component per file**
- **Types defined at file top**
- **Related utilities co-located**
- **Clear separation of concerns**
