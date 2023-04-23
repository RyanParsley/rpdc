---
title: "AEA Debrief: The Developer's Ampersandwich"
pubDate: 2014-03-13 15:08:10 -0400
description: ""
categories: design code
---

At <a href="http://aneventapart.com/event/atlanta-2014">An Event Apart</a> in Atlanta, <a href="http://jennlukas.com">Jenn Lukas</a>, presented a developer’s perspective on design for the web. Here’s a collection of take aways that resonated with&nbsp;me.

Lukas makes a point that often gets overlooked. Good design is part of good craftsmanship. Good design isn’t necessarily all that tightly coupled with subjectivity, fashion, taste or any other magical factors that tend to be associated with design. The fact that there are design fundamentals, means you can achieve good design&nbsp;logically.

## Bootstrap your typographical&nbsp;knowledge

Like any deep subject, typography can be rather intimidating to get started with. Just because you didn’t enjoy the Helvetica documentary doesn’t mean you’re doomed to create tacky web sites if unaided by a “proper&nbsp;designer”.

<blockquote>
  <p>“Blah blah blah… Verdana for headlines, Georgia for body copy… type type type blah blah blah.”
  — Jason Santa Maria (as paraphrased by Jenn&nbsp;Lucas)</p>
</blockquote>

<p>You can do a lot worse than simply stick to a limited pallet of trusted typefaces. Not sure what a “trusted” typeface is? Lukas has a hack for that. In her presentation, she presented 5 lists of the top 10 fonts on various font services. These are what the pros are using. These fonts are used for a reason. You don’t <em>need</em> to understand that reason. You can always learn it later if you care. Don’t be afraid to follow a trend if you don’t know any better. Emulation is often an early phase of&nbsp;learning.</p>

<h3>Google Fonts most popular&nbsp;fonts</h3>

<ol>
<li>Open&nbsp;Sans </li>
<li>Oswald</li>
<li>Droid&nbsp;Sans </li>
<li>Roboto</li>
<li>Lato</li>
<li><span class="caps">PT</span>&nbsp;Sans</li>
<li>Open Sans&nbsp;Condensed </li>
<li>Droid&nbsp;Serif</li>
<li>Ubuntu</li>
<li><span class="caps">PT</span> Sans&nbsp;Narrow</li>
</ol>

<h3>Typekit favorite&nbsp;fonts</h3>

<ol>
<li>Museo&nbsp;Sans</li>
<li>Adelle</li>
<li>Proxima&nbsp;Nova</li>
<li>Museo&nbsp;Slab</li>
<li>Futura <span class="caps">PT</span></li>
<li>Raleway</li>
<li>Myriad&nbsp;Pro</li>
<li>Museo</li>
<li>Freight Sans&nbsp;Pro </li>
<li><span class="caps">FF</span> Tisa&nbsp;Pro</li>
</ol>

<h3>Fonts.com top&nbsp;fonts</h3>

<ol>
<li>Trade&nbsp;Gothic</li>
<li>Neue&nbsp;Helvetica </li>
<li>Avenir&nbsp;Next</li>
<li>Univers</li>
<li>Avenir</li>
<li>Proxima&nbsp;Nova </li>
<li>Gill&nbsp;Sans</li>
<li>Frutiger</li>
<li>Futura</li>
<li>Helvetica</li>
</ol>

### Typewolf top&nbsp;fonts

<ol>
<li>Open&nbsp;Sans</li>
<li>Apercu</li>
<li>Brandon&nbsp;Grotesque </li>
<li>Montserrat</li>
<li>Futura</li>
<li>Avenir</li>
<li>Inconsolata</li>
<li>Roboto</li>
<li>Gotham</li>
<li>Proxima&nbsp;Nova</li>
</ol>

### Net Magazine showcase top&nbsp;fonts

<ol>
<li>Futura</li>
<li>Proxima&nbsp;Nova</li>
<li>Open&nbsp;Sans</li>
<li>Brandon&nbsp;Grotesque </li>
<li>Atrament&nbsp;Web</li>
<li>Roboto</li>
<li>Museo</li>
<li>Archer</li>
<li><span class="caps">FF</span> Tisa&nbsp;Web</li>
<li>Arvo</li>
</ol>

Looking at her list, I found it interesting that there was a bit of overlap between the different services. I made this list of fonts that show up on more than one of the above&nbsp;list:

### Cross service top 5 (plus one)&nbsp;fonts

1. Futura -&nbsp;4
2. Proxima Nova -&nbsp;4
3. Roboto -&nbsp;3
4. Open Sans -&nbsp;3
5. Brandon Grotesque&nbsp;-2
6. Avenir -&nbsp;2

## Familiarize yourself with web font&nbsp;limitations

This is important for designers and developers alike. Test and share font-families via the browser early in the process to make sure selected fonts will work for your audience before design approval. Don’t for get that “Fixing” a problem in one browser can make things worse in another. Leave plenty of room for <span class="caps">QA</span>.

> “… sometimes they look just ridiculous on windows machines. It’s a bit better with <span class="caps">IE10</span> but geez oh man. It’s enough to make a well designed website look like crap.”
> — Jason&nbsp;Head

## <span class="caps">CSS</span> Preprocessors/Variables Are Your&nbsp;Friend

Variables in Sass (or whatever preprocessor you prefer) have a very friendly syntax for setting&nbsp;variables:

```
$red: #ff0000;
$headline-font-family: "HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;
```

Use a text file containing these variables to communicate colors and typographical information between designers and developers. Attributes shared via a list of like this are far less likely to get lost than by using the type tool and eyedropper in a Photoshop document. Also, if this list gets cumbersome, it’s a good smell that maybe some simplification is in&nbsp;order.

There’s a lot of talk about the importance of designers learning to development. There is an equally strong case to be made for the&nbsp;inverse.
