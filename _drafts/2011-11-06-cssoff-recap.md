---
title: CSSOff recap
created: 1320626452
permalink: prose/cssoff-recap
tags:
- Left Brain
- Right Brain
---
<p>I recently competed in <a href="http://www.unmatchedstyle.com/cssoff/">UnmatchedStyle&rsquo;s CSSOff competition</a> where frontend developers each took a crack at marking up the same Photoshop document. Submissions are to be judged based on a list of parameters including: semantics, resource optimization, legacy browser support and general code cleanliness. We were encouraged to use HTML5 and tasked to support browsers as old as IE6. Here are some observations I made during and since the competition. For the TL;DR crowd, I have a version of my entry hosted in <a href="http://lab.ryanparsley.com/tripledare">the lab</a> and I uploaded the source to <a href="https://github.com/RyanParsley/TripleDare">github</a>.</p>

<h2>Whose design is it anyways?</h2>

<p>The biggest difference between this cometition and a regular day at the offce for me was, I never markup a design some one else created. Oftentimes, I let pending logistics of markup inform my design decisions. I don&rsquo;t think that this harms my designs, but it certainly shapes them to an extent. With this project, there were design decisions that seemed to have been made just to throw a monkey wrench at my markup. This was a lot of fun to deal with as I found myself leveraging CSS in ways outside of my confort zone. </p>

<h3>Physical challenge</h3>

<p>In an attempt to force myself to keep my code as concise as possible I opted to not use Compass &amp; Sass this time. I really missed it while creating the ieLT9 style sheet. I only used one third party bit of code, Remy Sharp&rsquo;s HTML5 Shim. This enabled me to easily use new HTML5 elements with IE6 support.</p>

<h2>Is it bigger than a breadbox?</h2>

<p>Knowing that I&rsquo;d be judged on project size had me far more mindful about lines of code than I usually am. I always strive to be as concise as (practically) possibly, but with this project I was really sweating the numbers. It was interesting to find out that I wrote a little over 500 lines of CSS to style around 200 lines of html. Furthermore, it was enlightening to see that after just 440 lines of CSS handled all the style and layout for all contexts for screen sizes, I had to write an additionally 113 lines of css (not to mention how many hours to think up those 113 clever lines) just to make the layout deprecate nicely for IE6. This could really be a nice bit of data for anyone striving to make a case for dropping support for outdated browsers.</p>

<h3>Squeeze play</h3>

<p>I also spent a lot more time thinking about image sizes than I usually do. When browser stats warrant support of IE6, I tend to simply serve 2 copies of images. I&rsquo;ll generate 24bit pngs for browsers that can handle them and gifs for those who don't. For this contest, that would have double dinged me on project&rsquo;s total size (not something that usually matters in the real world). This prompted me to work on seeing how good I could make legacy browser safe 8bit pngs. This mindfulness ultimately lead to much smaller file sizes across the board.</p>

<h2>Showcase</h2>

<p>I&rsquo;m not sure when the judging will be complete. Win or lose, I&rsquo;m curious to see what kind of score my project gets because, all in all, I didn&rsquo;t handle this project very much differently than I approach most projects. This competition was a great learning exercise and a lot of fun.</p>
