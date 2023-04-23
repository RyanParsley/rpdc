---
title: CSSOff recap
description: ""
pubDate: 2011-11-06
permalink: prose/cssoff-recap
tags:
  - Left Brain
  - Right Brain
---

I recently competed in [UnmatchedStyle’s CSSOff competition](http://www.unmatchedstyle.com/cssoff/) where frontend developers each took a crack at marking up the same Photoshop document. Submissions are to be judged based on a list of parameters including: semantics, resource optimization, legacy browser support and general code cleanliness. We were encouraged to use HTML5 and tasked to support browsers as old as IE6. Here are some observations I made during and since the competition. For the TL;DR crowd, I have a version of my entry hosted in [the lab](http://lab.ryanparsley.com/tripledare) and I uploaded the source to [github](https://github.com/RyanParsley/TripleDare).

## Whose design is it anyways?

The biggest difference between this cometition and a regular day at the offce for me was, I never markup a design some one else created. Oftentimes, I let pending logistics of markup inform my design decisions. I don’t think that this harms my designs, but it certainly shapes them to an extent. With this project, there were design decisions that seemed to have been made just to throw a monkey wrench at my markup. This was a lot of fun to deal with as I found myself leveraging CSS in ways outside of my confort zone.

### Physical challenge

In an attempt to force myself to keep my code as concise as possible I opted to not use Compass & Sass this time. I really missed it while creating the ieLT9 style sheet. I only used one third party bit of code, Remy Sharp’s HTML5 Shim. This enabled me to easily use new HTML5 elements with IE6 support.

## Is it bigger than a breadbox?

Knowing that I’d be judged on project size had me far more mindful about lines of code than I usually am. I always strive to be as concise as (practically) possibly, but with this project I was really sweating the numbers. It was interesting to find out that I wrote a little over 500 lines of CSS to style around 200 lines of html. Furthermore, it was enlightening to see that after just 440 lines of CSS handled all the style and layout for all contexts for screen sizes, I had to write an additionally 113 lines of css (not to mention how many hours to think up those 113 clever lines) just to make the layout deprecate nicely for IE6. This could really be a nice bit of data for anyone striving to make a case for dropping support for outdated browsers.

### Squeeze play

I also spent a lot more time thinking about image sizes than I usually do. When browser stats warrant support of IE6, I tend to simply serve 2 copies of images. I’ll generate 24bit pngs for browsers that can handle them and gifs for those who don't. For this contest, that would have double dinged me on project’s total size (not something that usually matters in the real world). This prompted me to work on seeing how good I could make legacy browser safe 8bit pngs. This mindfulness ultimately lead to much smaller file sizes across the board.

## Showcase

I’m not sure when the judging will be complete. Win or lose, I’m curious to see what kind of score my project gets because, all in all, I didn’t handle this project very much differently than I approach most projects. This competition was a great learning exercise and a lot of fun.
