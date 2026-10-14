# 📡 POSSE Integration Agent

**Purpose**: specialized agent for POSSE (Publish on your Own Site, Syndicate Elsewhere) implementation and maintenance.

## Core Features

- **Automatic discovery**: scans `src/content/ephemera/` for recent posts (last 24 hours)
- **Smart filtering**: only processes posts that haven't been syndicated yet
- **Multi-platform support**: currently supports Mastodon and Bluesky
- **Image handling**: uploads images from ephemera posts to social platforms
- **Content processing**: cleans markdown content for social media consumption
- **Rate limiting**: prevents spam with configurable delays between posts
- **Dry-run mode**: test syndication without actually posting
- **Error resilience**: continues processing even if individual posts fail

## Configuration Template

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
      dryRun: false,
      maxPosts: 3,
    }),
  ],
});
```

## Environment Variables

```bash
MASTODON_TOKEN=your_mastodon_access_token
MASTODON_INSTANCE=your.mastodon.instance
BLUESKY_USERNAME=your.bluesky.handle
BLUESKY_PASSWORD=your_bluesky_app_password
```

## Quality Standards

- **Type-safe** integration with full TypeScript support
- **Comprehensive testing** with mocked API responses
- **Error isolation** that doesn't break builds
- **Structured logging** for monitoring and debugging
