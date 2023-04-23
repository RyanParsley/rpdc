---
title: One size never fits all
description: ""
pubDate: 2010-08-17
tags:
  - Right Brain
---

While it is nice that new smartphones <em>can</em> render virtually any website reasonably well, we are remiss to not take context into account. Is &ldquo;reasonably well&rdquo; really your end goal? I have been dipping my toe into making this site more optimized for mobile consumption by serving up some size delineated styles. I wanted to share a couple of notes on my approach.

Early on, I was seduced by the siren&rsquo;s call of tools that offered a &ldquo;native experience&rdquo;. Frameworks like <a href="http://iwebkit.net">iWebkit</a> and <a href="http://jqtouch.com">jQTouch</a> promised to make my website look less like <em>my website</em> and more like <em>a native iPhone app</em>. At first, this seemed awesome. Doubly so, considering how easy either tool was to leverage via the the way <a href="http://drupal.org">drupal</a> handles multisite installs. Under closer consideration, however, I found two big issues with this approach. First, I didn't want my site to look like a generic app&hellip; I wanted it to look like <strong>my site</strong>. Secondly, looking like a generic iPhone app on an Android phone seems even less optimal. Don&rsquo;t get me wrong, these frameworks are super impressive&hellip; as long as what you&rsquo;re trying to do is create a usable interface with minimal effort. Most websites are, at least to some extent, about marketing. Blending in is not the first priority.

Enter media queries. Overriding some of the layout and letting most of the style persist seems to be the path of least resistance. We need to regard webkit based mobile browsers more as damage control for users than a crutch for creators. Mobile isn&rsquo;t the future anymore&hellip; it has been the present for quite some time.
