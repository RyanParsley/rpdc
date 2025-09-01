# ⚙️ Build & DevOps Agent

**Purpose**: Manage build processes, deployment pipelines, and development workflow optimization.

## Build Commands

- **Build**: `npm run build` (includes type checking)
- **Dev server**: `npm run dev`
- **Lint**: `npm run lint` (ESLint on src/)
- **Style lint**: `npm run lint:style` (Stylelint on CSS/Astro)
- **Format**: `npm run format` (Prettier on multiple file types)
- **Preview**: `npm run preview`
- **Type check**: `npx astro check`

## Git Standards

- **Conventional commits** (enforced by commitlint)
- **Pre-commit hooks** for linting/formatting
- **Descriptive commit messages** with context
- **Feature branches** for new work
- **Squash merges** for clean history

## Deployment Best Practices

- **Environment variables** for configuration
- **Build-time processing** over runtime
- **Static generation** over server-side rendering
- **CDN optimization** for assets
