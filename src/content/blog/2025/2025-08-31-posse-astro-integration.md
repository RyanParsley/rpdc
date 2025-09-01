---
title: "I Finally Got POSSE Automated"
description: "My journey from manual syndication to fully automated POSSE bliss."
pubDate: "2025-08-31"
categories: [code]
tags: [posse, indieweb, typescript, astro]
---

Almost a year ago, I wrote about my [game plan for POSSE](/blog/posse). Like
many automation projects, it sat on my back burner making me feel guilty every
time I manually posted to social media. Today I finally built an automated
workflow I'm proud to share.

## Static sites are the bees knees, but...

My blog runs on Astro, which is great, but I wanted to syndicate my ephemera
posts (notes in IndieWeb parlance) automatically to [social
media](https://mastodon.social/@RyanParsley). The rub is you want bidirectional
linking and SSG has a bit of a chicken and egg problem.

The gist is this, publishing content on your own site spawns the creation of a
post elsewhere. The syndicated post links to the canonical post and the
canonical post links to the syndication. The rub is, when you write markdown,
there is no syndicated post to mention in the frontmatter. This is a little
beyond the sweet spot of static sites, but not unachievable.

### The old way was _fine_ but not great

- I'd write a post, publish it
- Remember to copy the content to Mastodon
- Do the same for Bluesky
- Hope I didn't mess up the formatting

It worked, but I aspired for a more seamless process. Often, I'd regress to
simply using the mastodon app and only occasionally link up an ephemeral post
after the fact.

### The new hotness

I spent a weekend refactoring everything into a proper Astro integration. Here's
what the new system does:

- Scans my ephemera folder automatically
- Finds posts from the last 24 hours
- Skips ones I've already shared
- Posts to Mastodon and Bluesky
- Handles images and links properly
- Logs everything so I can see what happened

The best part? It runs every time I build the site. No extra steps, no
remembering to do it.

## My first Astro integration

Since my site is served via CloudCannon, my first instinct was to use their
build hooks. I got a version working and it was fine but testing was manual and
I accidentally spammed my mastodon account via a bug. This had me thinking about
alternative implementation details.

Getting this working required diving deeper into Astro's API. Not gonna lie, the
idea of using an Astro Integration came from me using OpenCode as a rubber duck.
I've wired up a few 3rd party integrations but making a custom one hadn't
occurred to me. I'm glad I went through the effort though because testing is way
easier and using Astro hooks feels more right than the previous approach did.

### What that looks like

Here's the core integration structure:

```typescript
// src/integrations/posse.ts
export default function posseIntegration(options: PosseOptions = {}) {
  const { mastodon, bluesky, dryRun = false, maxPosts = 3 } = options;

  return {
    name: "posse-syndication",
    hooks: {
      "astro:build:done": async ({ logger }) => {
        try {
          await runSyndication({ mastodon, bluesky, dryRun, maxPosts, logger });
          logger.info("POSSE: Syndication process completed successfully");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error(`POSSE: Syndication process failed: ${errorMessage}`);
        }
      },
    },
  };
}
```

Now it just works. Every time I deploy, it syndicates new posts. No extra steps.

### Code to post to the fediverse

This function handles content formatting for different platforms:

```typescript
function generatePostContent(
  data: EphemeraData,
  canonicalUrl: string,
  body: string,
  platform: "mastodon" | "bluesky",
): string {
  const initialContent = body?.trim() ? cleanContentForSocial(body.trim()) : "";
  const content =
    !initialContent || initialContent.length < 10
      ? data.title || "New ephemera post"
      : initialContent;

  const maxLength = platform === "bluesky" ? 300 : 400;
  // Reserve space for "\n\n" + canonicalUrl
  const urlSuffix = `\n\n${canonicalUrl}`;
  // Add safety buffer for grapheme counting differences and JSON overhead
  const safetyBuffer = platform === "bluesky" ? 20 : 10;
  const availableContentLength = maxLength - urlSuffix.length - safetyBuffer;

  const finalContent =
    content.length > availableContentLength
      ? content.substring(0, availableContentLength - 3) + "..."
      : content;

  return `${finalContent}${urlSuffix}`;
}
```

## More like a good start than a happy ending

This automation works and is useful today, but it's a solid foundation for
bigger goals. For now though, I'm thrilled that my posts finally syndicate
themselves—no more manual copying and pasting, no more forgotten social media
updates. I can write a silly thing in markdown once, and trust copies find their
way to appropriate silos.
