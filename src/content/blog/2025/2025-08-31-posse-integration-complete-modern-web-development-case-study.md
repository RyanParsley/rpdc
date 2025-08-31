---
title: "I Finally Got POSSE Automated"
description: "My journey from manual syndication to fully automated POSSE bliss."
pubDate: "2025-08-31"
categories: [code]
tags: [posse, indieweb, typescript, astro]
---

I love the idea of POSSE. I wrote about a game plan almost a year ago. Like so
many automation improvements, it just hung out on the back burner making me feel
bad for not making it better. Today was the day I dug in an made an automated
workflow that I'm proud to share.

## Static sites are the bees knees, but...

My blog runs on Astro, which is great, but I wanted to syndicate my ephemera
posts automatically to social media. In the parlance of IndieWeb, this content
type is a "note". I have a bit of a namespace collision with that where I like
using the word "note" for something that's a cross between a half-baked blog
post and an atomic note in the second brain sense of the word. So, with respect
to microformats, my ephemera is a note and my note is a post.

### The old way was _fine_ but not great

- I'd write a post, publish it
- Remember to copy the content to Mastodon
- Do the same for Bluesky
- Hope I didn't mess up the formatting

It worked, but I aspired for a more seemless process. Often, I'd regress to
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

Since my site is served via cloudcannon, my first instinct was to use thier
build hooks. I got a version working and it was fine but testing was manual and
I accidentally spammed my mastodon account via a bug. This had me thinking about
alternative implementation details. Not gonna lie, the idea of using an astro
integration came from me using OpenCode as a rubber duck. I've wired up a few
3rd party integrations but makign a custom one hadn't occured to me. I'm glad I
went through the effort though because testing is way easier and using astro
hooks feels more right than previous approach.

### What that looks like

```typescript
// src/integrations/posse.ts
export default function posseIntegration(options: PosseOptions = {}) {
  return {
    name: "posse-syndication",
    hooks: {
      "astro:build:done": async ({ logger }) => {
        await runSyndication(options, logger);
      },
    },
  };
}
```

Now it just works. Every time I deploy, it syndicates new posts. No extra steps.

### Code to post to the fediverse

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

  const maxLength = platform === "bluesky" ? 280 : 400;
  const finalContent =
    content.length > maxLength
      ? content.substring(0, maxLength - 3) + "..."
      : content;

  return `${finalContent}\n\n${canonicalUrl}`;
}
```

## Less of a happy ending and more like a good start

I'm happy that I have this level of automation wired up but I'm just getting
started with POSSE. But for now, I'm happy enough with making simple text posts
more ergonomic to make and share.
