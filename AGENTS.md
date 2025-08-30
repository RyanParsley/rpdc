# Agent Guidelines for RyanParsleyDotCom

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
- No unit test framework configured
