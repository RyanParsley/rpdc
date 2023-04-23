---
title: Initial response to Sass
description: ""
pubDate: 2011-03-02
tags:
  - Left Brain
---

<p>I really want to like Sass, I have tried to pick it up a couple of times. Granted, each time I have played with it thus far, has been a fairly short interval. My most recent forray with it underscored why I think it hasn&#8217;t quite stuck with me yet. My markup/coding conventions seem to inherently solve most of the issues that Sass tackles.</p>

<h2>Things that seem redundant</h2>

<p>One of the benefits of Sass is, it makes it easy to keep style derived classes out of your markup. An example being, if you use blueprint (or some other modular css library) you may be tempted to add these predefined &#8220;style centric&#8221; classes to your markup. Instead of this, you could use Sass mixins. The assumption here is that people simply attach classes to their elements willie nillie. I may do this in the prototype phase of creating a layout, but ultimately I remove all that stuff. In the end I add the element&#8217;s semantic class to a chain of classes in various style blocks in the in the css file.</p>

<pre>
.clearfix, header, .container, ...{
  [clearfix styles]
}
</pre>

<p>It would be nice to be able the skip the phase where I fold the semantic classes back into the modular style sheet. However, that in and of itself, is not the most compelling of reasons as it comes together rather quickly.</p>

<h2>Things I&#8217;d like from SASS</h2>

<p>Another strength of Sass is the ability to add logic to your CSS. This sounds like a dream come true, until I realize the discrepancies of how I <em>want</em> to use logic in my CSS and the way that Sass provides. The first thing I hoped to use Sass for was converting px measurements to ems. Ultimately I'd like to think in pixels and let the style sheet be written in ems. Along those lines, the first mixin I wrote was to the effect of:</p>

<pre>
@mixin scaleFont($target, $context){
  font-size:#{$target/$context}em;
}
</pre>

<p>That works, as long as $target and $context are provided in the same unit of measure. The rub is, once you apply this mixin, the resulting element would have it&#8217;s new context expressed in ems. This means, if you wanted to use the result of this as your new context, you need to know the new target in ems. This doesn&#8217;t actually solve the problem where stepping between cascades of contexts makes it hard to keep track of what &#8220;1em&#8221; means at any given point. What I&#8217;d really love is a way to do something to the effect of:</p>

<pre>
@mixin scaleFont($target){
  font-size:#{$target/this.context}em;
}
</pre>

<p>Furthermore, it would be epic if Sass (or some other solution) could tell more about the element being targeted (border-bottom-width, line-height&#8230;). Imagine being able to write a style that was intellegent enough to subtract a bottom border from the line-height automatically to maintain your vertical rhythm for you. Along those lines&#8230; wouldn&#8217;t it be great if firebug displayed the effective size, in pixels, when displaying what &#8220;em&#8221; dimension something was?</p>

<p>Maybe I just haven&#8217;t played around with Sass enough at this point. Do you have any good approaches where Sass comes closer to solving these conversion/ rhythm issues? I&rsquo;d love to hear how Sass helps you.</p>
