---
title: "Vim tip: Fun with tags"
description: ""
pubDate: 2012-01-08
tags:
  - Left Brain
---

HTML can feel unwieldy and inefficient to edit. There are lots of great tools and alternate syntaxes that make this easier... but who wants to set up a whole framework and all the dependancies that come with that just to be <em>more efficient</em>. With a basic Vim command and the [surround plugin](https://github.com/tpope/vim-surround) you can greatly increase your productivity traversing and manipulating tags.

## Say, for instance, you have:

```
<ul>
  <li>something</li>
  <li>something else</li>
</ul>
```

## &hellip; and you want to make these list items links.

1. Place your curser inside the list item
2. Type `vit`. This will visually (v) select the text inside (i) the surrounding tag (t).
3. Now type `s <a href="#" >` and the surround plugin wraps the selected text with anchor tags

I find that the surround plugin is an excellent companion to the [sparkup](https://github.com/rstacruz/sparkup) plugin.
