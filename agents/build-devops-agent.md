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

### Worktrees are mandatory for branch-based work

- **The primary checkout stays on `main`.** It is for browsing, merging, and
  release work only - never for editing a PR, and never a place to commit from
- **One PR = one branch = one worktree**, created with the `wt` CLI (worktrunk):

  ```bash
  wt switch --create fix/posse-media-retry   # branch + worktree + npm ci
  # ... work and commit inside the worktree ...
  gh pr create --fill && gh pr merge --squash --delete-branch
  wt remove fix/posse-media-retry            # worktree gone, branch if merged
  ```

- **`.config/wt.toml` is the repo's worktree config** and is committed. Its
  `pre-start` hook runs `npm ci --no-audit --no-fund`, so a fresh worktree is
  immediately buildable. Hook commands require one-time approval (`wt config
  approvals`); a missing approval looks like a broken worktree, not a config bug
- **Branch naming stays conventional-commit compatible:** `<type>/<slug>` with
  `type` in `feat|fix|refactor|docs|chore|test`, kebab-case slug, because
  commitlint scopes and PR titles mirror it
- **`wt merge`** merges the current branch into its target from inside the
  worktree; it does not require switching the primary checkout back to `main`
- **Why:** multiple agents work this repo in parallel. A shared checkout means
  one agent's `npm ci`, stash, or checkout silently changes another's tree.
  Worktrees isolate the working directory while sharing `.git`, object storage,
  hooks, and config
- **`git worktree list`** is the way to see what is in flight
  (`wt list --visible` for status)

### Everything else

- **Conventional commits** (enforced by commitlint)
- **Never commit on `main`.** The `pre-commit` guard refuses it. If it fires,
  create a worktree with `wt switch --create <type>/<slug>`
- **Never bypass hooks.** No `git commit --no-verify`, and no reading hook source
  looking for a bypass. Skipping hooks skips `lint-staged` and `commitlint` at
  once, and CI re-runs the checks against the result anyway
- **Merge commits and release bumps on `main` are human actions.** If one seems
  required, ask
- **If a hook legitimately blocks correct work:** fix the file it flagged, or
  `git add` what the hook auto-modified and commit again
- **Descriptive commit messages** with context
- **Squash merges** for clean history

## Deployment Best Practices

- **Environment variables** for configuration
- **Build-time processing** over runtime
- **Static generation** over server-side rendering
- **CDN optimization** for assets
