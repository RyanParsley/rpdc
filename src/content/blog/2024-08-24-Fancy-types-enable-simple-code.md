---
title: Fancy types enable simple code
description: Thoughts on type safety and generic types in astro
pubDate: 2024-08-24
updatedDate: 2024-08-24
featured: true
categories:
  - code
tags:
  - code
  - astro
  - typeScript
  - zod
---

Developers often claim that leveraging TypeScript's advanced type system can
lead to more readable and maintainable code. While that can be the case, it's
not guaranteed. If you're not careful in implementation, following the orders
of a pedantic linters can feel like unwanted friction to shipping code. And
worse, you could be adding brittleness more than robustness to your code. This
article explores a case study in how generics and union types can improve
readability by enabling inference.

Suppose you want to create a list of tags for notes. The following approach
seems reasonable at first glance. It works fine because it presumes you only
want to consider tags for one type of content.

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

I currently have two very similar content types: `blog` and `note`. They both
have _tags_, but they're not guaranteed to be the same or stay similar beyond
that.

### How do I adjust this component to be usable by both?

My initial approach was to move the logic such that this component only dealt
with an array of strings. There's a problem with moving the responsibility of
deriving tags to the parent component, this approach is more likely to let
duplication of logic to creep in. As this component is responsible for `tags`
and not simply making a list from strings, the `Tags` component feels like where
this logic should live.

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
I passed a collection in, all the clever type inference broke. At that point, I
needed to explicitly type all the things to keep my pedantic linter happy.
That's not what you want. This works as intended, but we can do better.

Note, if you find yourself using `as`, consider that you might be doing
something wrong. Maybe you're not, but consider it. It exists for a reason, but
I find I usually don't need it when I'm "done" refactoring.

## Chef's Kiss third draft

The trick to getting inferred types back in action hinges around leveraging a
Props interface. I'm new to Astro, but I suspect you'll want to make use of this
interface more often than not. In this interface, I opted to use a type union
that expresses all the collection types that I'm accounting for.

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

## Alternative idea

I could have defined that union in the content config by creating a generic
type, but that approach feels presumptuous and the wrong level of abstraction
for my purposes. I'll have to write about why later.

## Conclusion

With this final implementation, the compiler is back to inferring properly
without the need to explicitly type every callback. There is no need to create
that _lying_ Collection type that is doomed to drift away from reality. Through
explicitly typing a little up front, we can enjoy type safety implicitly
downstream.
