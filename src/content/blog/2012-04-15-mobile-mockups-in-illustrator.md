---
title: Mobile mockups in Illustrator
description: ""
pubDate: 2012-04-15
tags:
  - Right Brain
---

The Illustrator pixel is a majestic beast quite hard to pin down. The very nature of vectors makes the idea of a 300px by 300px document kind of silly. All you really know is it's a square. You can take the same document you create in Illustrator and export it as big or as little as you like and it will look perfect (Some exceptions apply. See offer details. Your experience in scaling vectors may vary). A thing that frustrates many Illustrator newbies is that Illustrator displays documents as though they are 72dpi when viewing them on the screen.

Since your monitor is almost certainly not 72dpi, this makes Illustrator less than convenient for previewing digital assets on the screen. For this reason I think the most sensible thing to do is declare your documents in inches instead of pixels. Then, go about your business. You only need to sweat the math at three points.

1. When you want to create a raster assets, make sure you use `File > Save for Web & Devices` and input the proper pixel count you want to get back.
2. If you want to view the mockup "actual size" on your monitor, zoom to a degree derived from this familiar looking formula: `[Monitor Resolution]/[Document Resolution] = Zoom`. For instance, if you have a 96dpi monitor and a 72dpi document (all Illustrator documents), you would want to zoom by 133% to see the document "actual size".
3. When you need to express the size of something in dp, simply multiply the size in pixels by .45 ( 72/160, since Illustrator always assumes 72dpi).

If you liked this, you may want to want to read my recent post about Android's density independent pixels. Hopefully this little bit of math helps to demystify the size discrepancies that frustrate many designers new to Illustrator.
