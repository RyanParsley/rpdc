---
title: "Refactoring my Astro Gallery Component"
description: "I refactored my Gallery Component to make better use of the Astro build process."
pubDate: 2024-09-26
updatedDate: 2024-09-26
featured: true
categories:
  - code
tags:
  - typeScript
  - astro
---

One of the first components I wrote for this blog migration was a naive image
gallery. It's pretty straight forward and got mostly got the job done, but there
was a few implementation details I've been itching to improve and I recently
took the time to make those enhancements. Let's dig into the details of my
refactor and talk about some of the benefits of this new iteration.

## How it started

Let's start by looking at the first iteration that I shipped.  This component
was functional, and a completely respectable thing to ship to production, but
there's always room for improvement. Does anything jump out to you as
problematic before you read on?

```astro
---
type Image = {
 url: string;
 alt: string;
};
type Props = {
 images: Image[];
};
const { images } = Astro.props;
---
<div class="gallery">
 {
  images.map((image: Image, index: number) => (
   <>
    <figure>
     <a href={`#image-${index}`} title={image.alt}>
      <img src={image.url} alt={image.alt} />
     </a>
    </figure>
    <a
     href="#_"
     class="lightbox"
     id={`image-${index}`}
     title="Click to return to post"
    >
     <div style={`background-image:url(${image.url})`} />
    </a>
   </>
  ))
 }
</div>
```

## How it's going

Now, let's take a look at my recently refactored version. It's got more going on
to be sure.

```astro
---
import { Image } from "astro:assets";
import type { ImageMetadata } from "astro";
type ImageData = {
 url: string;
 alt: string;
};
type Props = {
 images: ImageData[];
 path: string;
};
const { images, path } = Astro.props;
const getFullPath = (url: string) =>
 url.startsWith("./")
  ? `/src/content${path}/${url.replace("./", "")}`
  : `/src/assets/${url.replace("./", "")}`;
const imagePaths = images.map((img) => ({
 ...img,
 url: getFullPath(img.url),
}));
const imageAssets = import.meta.glob<{ default: ImageMetadata }>(
 `/src/**/*.{jpeg,jpg,png,gif}`,
);
const deriveSrc = async (image: ImageData) => {
 const source = imageAssets?.[image?.url]?.();
 if (source === undefined) {
  throw new Error(
   `"${image.url}" does not exist in glob: "src/assets/*.{jpeg,jpg,png,gif}"`,
  );
 }
 return source;
};
---
<div class="gallery">
 {
  imagePaths.map((image: ImageData, index: number) => (
   <>
    <figure>
     <a href={`#image-${index}`} title={image.alt}>
      <Image src={deriveSrc(image)} alt={image.alt} />
     </a>
    </figure>
    <a
     href="#_"
     class="lightbox"
     id={`image-${index}`}
     title="Click to return to post"
    >
     <div>
      <Image src={deriveSrc(image)} alt={image.alt} />
     </div>
    </a>
   </>
  ))
 }
</div>
```

## Key improvements

My initial design failed to take advantage of Astro's build-time image
optimization. The reason I couldn't take advantage of that was this component
looked in the `public` directory for assets. Only assets in the `src` directory
are optimized at build time. As I wanted my component to receive props from
markdown frontmatter, relative pathing was a little tricker than I wanted to
sort out upfront. Supporting this is the primary reason for all the extra
complexity in the refactor.

### Astro `Image` integration

The refactor starts with the introduction of the `Image` component from
`astro:assets`. This is better than the native `img` tag for the following
reasons.

- Automatic image optimization
- Lazy loading out of the box
- Proper sizing and srcset generation

### With great power... yada yada

Switching to this richer image solution comes with some complexity to get it up
and running. First, I can't simply use a `src` string prop and call it a day. I
I need to import images so Astro is enabled to do it's thing at build time. The
docs make this look simple enough because they're just importing a single static
asset. In my case, this gets more complicated because I want to handle this
dynamically. Fortunately, a more advanced recipe introduced me to a vite method
`import.meta.glob` to help. The following code will gather all images found in
the `src` directory and make them available for the `Image` component.

```astro
const imageAssets = import.meta.glob<{ default: ImageMetadata }>(
`/src/**/*.{jpeg,jpg,png,gif}`,
);
```

### Flexible path handling

Access to images is only half of the equation though. I need to sort out a
sensible strategy for mapping my frontmatter to this collection to retrieve the
images I want. The new `getFullPath` function allows for this. I may build this
out more later, but for now, I images relative to the markdown, or absolute by
way of a designated asset directory.

 ```astro
 const getFullPath = (url: string) =>
  url.startsWith("./")
   ? `/src/content${path}/${url.replace("./", "")}`
   : `/src/assets/${url.replace("./", "")}`;
 ```

## Conclusion

When I first read about the Image component, I naively thought I'd get
performance "for free". While supporting this took some additional work, both my
developer experience and the performance of my site are noticeably better for
having made this refactor. I'm trying to make it a little better every day.
