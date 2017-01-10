---
title: Hello Jekyll
published: true
---
In an effort to avoid distraction and get right to writing, I chose to move this blog to [Jekyll](https://jekyllrb.com/). It's a simple enough tool that lets me draft posts in [markdown](https://daringfireball.net/projects/markdown/). I'm drafting this post on my phone as I pace the floor trying to get my youngest to take a nap.

The major, potential, downside with choosing Jekyll is: I'm not familiar with it.
It is, however, made with familiar stuff. I don't know if it's the perfect tool, 
but that fits the tone of this blog and may give me more content to write about.

## Why Jekyll?

As I mentioned before, Jekyll sites are built from a collection of plain text
markdown files. This means I can write posts in any text editor of my choosing.
I don't need a special app to get work done (although, I am enjoying [Mr. Hyde Android app](https://play.google.com/store/apps/details?id=org.faudroids.mrhyde)).
I don't need to set up a CMS or blog platform on a server. All the software
needed to make it work runs in my phone.

## Why not Drupal?

Drupal has been my CMS of choice for years, and I still like it better than any
other CMS that I've used. For this largely neglected blog, I found myself
spending more time running security updates than writing blog posts. At one
point, failing to run updates fast enough left me vulnerable for an attack.
Proper care and feeding of a CMS is not a hobby that I care to take on. I'm
drawn to a simpler approach.

## How is it built?

While hosting via github pages is the simplest way to host a jekyll site, I opted to keep my blog on my Rackspace server. This left me needing to sort out a deploy/build strategy if I am to publish from my phone. While I can run the build script in [termux](https://termux.com/) to generate html, or remote into my server and use my phone as a terminal, I opted to set up [jenkins](https://jenkins.io/) to build and deploy on my behalf each time the master branch is updated on github. I'll likely go into more detail on those tools in future posts.
