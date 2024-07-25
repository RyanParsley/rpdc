---
title: Astro Tag Component
description: Thoughts on type safety and generic types in astro
pubDate: 2024-07-25
updatedDate: 2024-07-25
featured: true
tags:
  - note
  - code
  - astro
  - typescript
  - zod
---

Let's say you want to create a list of tags for notes. The following seems
reasonable. It works fine because it presumes you only want to consider tags for
one type of content.

## Naive first draft

```typescript
const tags = [
  ...new Set(
    (await getCollection("note"))
      .filter((note) => !!note.data.tags)
      .map((note) => note.data.tags)
      .flat()
      .filter((tag) => tag !== "note"),
  ),
];
```

I currently have 2 very similar content types `blog` and `note`. They both have
_tags_, but they're not guaranteed to be the same or stay similar beyond that.

### How do I adjust this component to be usable by both?

My first thought was to move the logic such that this component only dealt with
an array of strings, but if the responsibility of deriving tags moved to the
parent component, it seems there's more likelihood of logic duplication. As this
component is responsible for `tags` an not simply making a list from strings,
the `Tags` component feels like where this logic should live.

## Problematic second draft

Don't copy and paste this next bit, it's just here so I can critique it.

```typescript
const { collection, baseRoute } = Astro.props;
type Collection = { data: { tags: string[] } };
const tags = [
  ...new Set(
    collection
      .filter((note: Collection) => !!note.data.tags)
      .map((note: Collection) => note.data.tags)
      .flat()
      .filter((tag: string) => tag !== "note"),
  ),
] as string[];
```

### The good

Passing in a collection and baseRoute as Props feels like what I want. It seems
reasonable to assume the parent component is concerned with a particular content
type when the component is implemented, so let them declare that at that level.

### The bad

The problematic bits are around that Collection type. I created it because, once
I passed a collection in, all the clever type inference broke and I needed to
explicitly type all the things. That's not what you want. This works as
intended, but we can do better.

Note, if you find yourself using `as` consider you're doing something wrong.
Maybe you're not, but consider it. It exists for a reason, but I find I usually
don't need it when I'm "done" refactoring.

## Chef's Kiss third draft

The trick to getting inferred types back in action hinges around leveraging a
Props interface. I presume I want to do more often than not. In this interface,
I opted to make use a type union that expresses all the collection types that
I'm accounting for.

```typescript
import type { CollectionEntry } from "astro:content";
const { collection, baseRoute } = Astro.props;
interface Props {
  collection: CollectionEntry<"blog">[] | CollectionEntry<"note">[];
  baseRoute: string;
}
const tags = [
  ...new Set(
    collection
      .filter((entry) => !!entry.data.tags)
      .map((entry) => entry.data.tags)
      .flat()
      .filter((tag) => tag !== "note"),
  ),
];
```

With this, the compiler is back to inferring properly without the need to
explicitly type my arrow functions and no need to create that lying Collection
type that is doomed to drift away from reality.

## Alternative idea

I could have defined that union in the content config by creating some generic
type but that feels presumptuous and the wrong level of abstraction for my
purposes, but I'll have to write about why later.
