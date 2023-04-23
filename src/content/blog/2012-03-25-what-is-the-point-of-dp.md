---
title: What is the point of dp?
description: ""
pubDate: 2012-03-25
tags:
  - Left Brain
---

I've been reading up on Android interface design lately. One thing that has jumped out at me as counter intuitive is the concept of "density independent pixels" or dp. At first, I was very excited to see that Google was working to provide a way for designs to "just work" on all devices. Then, I read up on how it works.

## The math

According to [documentation](http://developer.android.com/guide/practices/screens_support.html) you can convert px to dp with the following formula:
`px = dp *(dpi/160)`

Math nerds can probably already tell that this isn't likely to quite "do what it says on the tin". At least, not if you intuited the same goal of the dp that I did. I'll plug in a couple of numbers to illustrate the problem.

### HTC Rezound

The HTC Rezound has a 4.3" screen with 720px X 1280px resolution at 342dpi.

`width in dp = 720/(342/160) = 337`

### Galaxy Nexus

The Galaxy Nexus has a 4.65" screen with a 720px X 1280px resolution screen at 316dpi

`width in dp = 720/(316/160) = 365`

Wait, that doesn't seem right. Does it? If we are defining a 720px X 1280px resolution in density independent terms shouldn't they result in the same size? I got more than a little hung up on this. Then, I tried the following.

### Droid Razr

The Droid Razr has a 4.3" screen with 540px x 960px resolution at 256 dpi

`width in dp = 540/(256/160) = 338`

There is the clarity I was looking for! The Droid Razr's dp count is the same as the HTC Rezound because they have _the same physical dimensions_ regardless of the pixel count (or density). Density independent pixels don't help you translate dimensions freely between many device sizes, they simply are a unit bound to a physical size yet separated from resolution. They work much the same way a pt is always 1/72 of an inch regardless of resolution of your printer.

Is that helpful? Maybe, but not nearly as helpful as what I imagined it would be. At least now we understand the purpose of the dp. Soon, I'll show you how to make this bit of information useful in Illustrator and uncover the first feature of Fireworks that made me think about switching from Illustrator. But that... is another post.
