---
title: "Dr. Strangecode or: How I Learned to Stop Worrying and Love the DOM"
description: ""
pubDate: 2008-02-06
permalink: prose/dr-strangecode-or-how-i-learned-stop-worrying-and-love-dom
tags:
  - Left Brain
---

**Narrator:** For more than 12 years, ominous rumors had been privately circulating among high-level web developers that a world wide consortium had been at work on what was darkly hinted to be the ultimate weapon: a doomsday device. Intelligence sources traced the home bases of this top secret international project to the perpetually fog-shrouded wasteland below the facilities of MIT/CSAIL (USA), ERCIM (France), and Keio Univ. (Japan). What they were building or why it should be located in such remote and desolate places no one could say.

## Well, I’ve been to one world fair, a picnic, and a rodeo, and that’s the stupidest thing I ever heard? You sure you got today’s codes?

Do you still use tables to control your layouts or know someone who does? It is ok, I am here to help. I’ll level with you; I too once used tables to control my layouts. But thanks to [Jeff Zeldman](http://www.amazon.com/Designing-Web-Standards-Jeffrey-Zeldman/dp/0321385551/ref=pd_bbs_sr_1/104-2454640-8435942?ie=UTF8&s=books&qid=1192383120&sr=1-1?ie=UTF8&tag=ryan0d-20&link_code=em1&camp=212341&creative=384049&creativeASIN=0275954544&adid=08442520-5931-460e-b021-b261d385583c/) and other standards evangelists, I have found the way. In this, my first post, I am going to do my best to perpetuate the standards movement by posting about the reasons web standards are good for humanity.

For me the journey to smart web design began in 2003 by reading [Designing with Web Standards, by Jeffrey Zeldman](http://www.amazon.com/Designing-Web-Standards-Jeffrey-Zeldman/dp/0321385551/ref=pd_bbs_sr_1/104-2454640-8435942?ie=UTF8&s=books&qid=1192383120&sr=1-1?ie=UTF8&tag=ryan0d-20&link_code=em1&camp=212341&creative=384049&creativeASIN=0275954544&adid=08442520-5931-460e-b021-b261d385583c). Upon reading this book I had a bit of a “eureka” moment. If you have not yet read this book I recommend it (the [second edition](http://www.amazon.com/Designing-Web-Standards-Jeffrey-Zeldman/dp/0321385551/ref=pd_bbs_sr_1/104-2454640-8435942?ie=UTF8&s=books&qid=1192383120&sr=1-1?ie=UTF8&tag=ryan0d-20&link_code=em1&camp=212341&creative=384049&creativeASIN=0275954544&adid=08442520-5931-460e-b021-b261d385583c) just came out recently). Many of the HTML conventions I had previously adhered to, simply because they “worked” (I mean really… spacer gifs… what was I thinking), were about to become a thing of the past. Ah, but it was not an easy transition, I had been programmed to do bad things. At first my sites were just as clunky as a table based websites… I had to fight the urge to simply swap tr and td tags for div tags. I thought that all elements needed to be bound by something or they may run away.

## “through the purity and essence of our natural” fluids

If you began web development with table based layouts, you may see this whole tableless development as just another of the many fads the web development community seems so eager advocate then abandon. Table ridden websites download slower, put more stress on your server, and are more likely to break for no apparent reason.

If you have been using tables for a while, it may not seem obvious, but if you think about it, how many times do you use nonsensical “hacks”? How many spacer gifs do you implement? How many times do you mark “width=100%” only to cross your fingers hoping that it fills the existing space and not force your containing table to stretch erratically? For that matter how many times does it stretch erratically?

## But this is absolute madness, Ambassador! Why should you build such a thing?

Oh, I know what you?re saying, “But Ryan, that's the way they did it in nineties and the internet thrived”. People tight-rolled their pant cuffs in the nineties too… we have evolved. In a nutshell, the nineties were decadent era for web design (among other things). Web development could be sloppy; there was plenty of money to write one website for IE, and a couple for Netscape. Font tags for every one! Hire another guy to make sure all in-line styles to the appropriate sidebar links are the right shade of magenta. Of course in-line, I mean, it isn't as though there exists some sort of _complete_ and _recursive_ (cascading) declaration your site's _appearance_ (style?) of the entire website in an external _page_ (or sheet). So that all 200 pages of this site could share a single… hmm what do we call it CRAP… certainly not, maybe just simplify it… CSS.

Enter CSS. One sheet to rule them all. No need to spend sleepless nights ensuring that all of your buhgillion inline styles and are consistent amongst many pages. Less chance of those obnoxious pixel-jumping page changes that result from one of your pages using a slightly different font size. It is a kinder, gentler, more logical web.

## Gentlemen, you can’t fight in here! This is the War Room

Let me just plainly state… tables are not evil. They have a purpose. To display tabular data (oh yeah, what technical blog is complete without a recursive definition), and that is where it ends. You need fields of data to line up in a grid based relational format; table is the man for the job. You need logical structure to a website that is both easy to disperse on wide scale use and won't impact the market value of Maalox; table is not up to the challenge.

I feel the need to say this, as all too many times, I have seen new tableless zealots spend hours (if not days) coding an all div representation of some sort of data matrix (or table). I feel Charlton Heston would agree with me when I say, tables do not make absurd websites, designer/ developers that use tables incorrectly make absurd websites. To be fair, designers/ developers can make equally if not more absurd websites with CSS. The key here is to design more intelligently.
