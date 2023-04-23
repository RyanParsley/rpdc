---
title: Easy on the polyfills
description: ""
pubDate: 2012-04-28
tags:
  - Left Brain
---

It&rsquo;s not that important to teach older versions of IE how to handle media queries. The point is to make layouts work on small screens. I don't know of any cell phones running IE6. As an alternative to using polyfills, I tend handle legacy IE with conditional comments. The only trade off for this is, IE < 9 users can&rsquo;t change the layout by fiddling with the window size. I can live with that. Here is how I use Sass to eliminate the redundancies associated with this kind of browser sniffing.

Wrap all of the styles that would be declared within the laptop sized media query in a mixin. Then, call that mixin from inside a media query. No magic so far, just using a mixin in lieu of copy and paste.

## \_laptop.scss

```
@mixin laptop {
  [all of your laptop size styles go here]
}
@media only screen and (min-width: 992px) {
  @include laptop;
}
```

Next, I call the same mixin from within an partial made just for old versions of IE. Finally, I link to that stylesheet from within an IE conditional comment.

## \_ieLT9.scss

```
@include laptop;
// That is likely to be the entire contents.
```

## IE conditional comment

```
<!--[if lt IE 9 ]>
  <link rel="stylesheet" href="/path-to/css/ieLT9.css" media="screen, projection">
<![endif]-->
```

That&rsquo;s it. Now you don't have to worry about keeping your layout changes in sync across nearly identical sheets. Old browsers get a sensible layout. Best of all, we didn&rsquo;t have to use any javascript.
