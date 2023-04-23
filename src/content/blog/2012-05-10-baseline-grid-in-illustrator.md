---
title: Baseline grid in Illustrator
description: ""
pubDate: 2012-05-10
permalink: prose/baseline-grid-illustrator
tags:
  - Left Brain
---

I [recently wrote](http://ryanparsley.com/prose/horizontal-grids-illustrator) about an easy way to set up a grid in Illustrator. While that way is great for setting horizontal rhythm, I follow a different method for creating my baseline grid. This couldn't be simpler thanks to the Transform Effect.

1. Select the Line Segment Tool (\\)
2. Click anywhere on the canvas
3. Enter 1024 for length and make sure the angle is set to 0
4. Give the path a sensible color
5. Use the Transform Pallet to position the line at the top left corner
6. `Menu > Effect > Distort & Transform > Transform`
7. Let's set a 24px baseline grid by entering 24px in `Move > Vertical`. Then, enter 32 in the "Copies" input area.

That's all there is to it. At this point, you can change your baseline via the appearance pallet. I tend to not turn my baseline grid lines into guides because I rarely want to snap to them. If you do want to turn them into guides:

1. Select the group of lines
2. `Menu > Object > Expand Appearance`
3. `Menu > View > Guides > Make Guides`

The only thing missing from this is a more sophisticated baseline text alignment like InDesign has, but this is all you really need for wireframing.
