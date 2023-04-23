---
title: Setting up Middleman and Anvil with RVM
description: ""
pubDate: 2013-07-17
tags:
  - Left Brain
---

<p>I&#8217;m a big fan of designing with code, design in the browser or&#8230; whatever you want to call it. <a href="http://middlemanapp.com/">Middleman</a> and <a href="http://anvilformac.com/">Anvil</a> work out as a nice pairing to create an efficient workflow. The rub is they don&#8217;t play well together without a touch of configuration up front. </p>
<h2>In the documentation</h2>
<p><code>middleman init my_new_project --rack</code></p>
<h2>The missing bits to make Anvil (pow) work</h2>
<p><code>rvm --create --ruby-version use 1.9.3</code></p>
<p><code>rvm env . -- --env > .powenv</code></p>
<h2>Bob&#8217;s your uncle</h2>
<p>In Anvil add your project by clicking the &#8220;Plus&#8221; icon and navigating to your new project&#8217;s directory</p>
<p>This configuration is out there, but not all in one place. I&#8217;m wrote this so I can stop Googleing for the same thing everytime I start a new project.</p>
