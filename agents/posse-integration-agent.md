# 📡 POSSE Integration Agent

**Purpose**: Specialized agent for POSSE (Publish on your Own Site, Syndicate Elsewhere) implementation and maintenance.

## Core Features

- **Automatic Discovery**: Scans `src/content/ephemera/` for recent posts (last 24 hours)
- **Smart Filtering**: Only processes posts that haven't been syndicated yet
- **Multi-Platform Support**: Currently supports Mastodon and Bluesky
- **Image Handling**: Uploads images from ephemera posts to social platforms
- **Content Processing**: Cleans markdown content for social media consumption
- **Rate Limiting**: Prevents spam with configurable delays between posts
- **Dry-Run Mode**: Test syndication without actually posting
- **Error Resilience**: Continues processing even if individual posts fail

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
