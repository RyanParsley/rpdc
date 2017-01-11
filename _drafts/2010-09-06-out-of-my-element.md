---
layout: post
title: Out of my element
created: 1283810205
permalink: prose/out-my-element
tags:
- Left Brain
---
<p>I recently resolved a server performance issue. Here&rsquo;s a recap of what I went through in hopes you find it useful. I&rsquo;m running <a href="http://ubuntu.com">Ubuntu</a> on the smallest <a href="http://www.rackspacecloud.com/1345.html">Rackspace Cloud Server</a> available (too much foreshadow?). The server has 256MB of ram and it&rsquo;s sole purpose is to run <a href-"http://drupal.org">Drupal</a> on Apache. I have set up a few servers in the past, but I do not claim to be an expert.  This recent problem had me stumped for a while.</p>
<h2>The Symptoms</h2>
<p>Soon after Apache was started (or restarted), all was well. Over time the server would continue to grow slower. When the server was most bogged down, running &ldquo;free -m&rdquo; would show that all of the swap was in use. Running &ldquo;ps aux --sort -rss&rdquo; revealed that all of the memory was, in fact, being used by Apache.</p>
<p>This bit of information didn&rsquo;t strike me as very valuable since I was hoping to just shut down whatever was using all of the memory. If any other service was using all of the memory I&rsquo;d shut it down&hellip; but Apache is the whole reason the site is up. The fact that the server seemed fine at first, then got progressively worse, made me think memory leak. I was wrong.</p>
<h2>The Resolution</h2>
<p>Reluctantly, I opened a chat with support. I assumed the chat would be a waste of time (based on previous experiences with other hosting providers I have dealt with in the past). I assumed that I would get a response to the effect of: &ldquo;There are too many variables in a server for us to trouble shoot this issue. Might I suggest our more expensive option?&rdquo; This was not my experience.</p>
<p>Jordan C. shot me a handful of links to posts where people outlined ways they needed to reconfigure Apache for running on less than 512MB. I did not realize that 256MB was frugal enough to require special configuration. Since I have never set up a server with less than 512MB of ram, I've never needed to fuss much with the default configuration of Apache. I was used to Apache <em>just</em> working. </p>
<p>The links that proved most helpful for me were on <a href="http://daniel.shortens.net/weblog/apache-optimization">shortens.net</a> and <a href="http://wiki.vpslink.com/Low_memory_MySQL_/_Apache_configurations"> vpslink.com</a>. After sniffing around the internet and a little trial & error this is the bit of configuration that ultimately fixed my particular issue.</p>
<pre>
&lt;IfModule mpm_prefork_module>
    StartServers          5
    MinSpareServers       5
    MaxSpareServers       10
    MaxClients            100
    MaxRequestsPerChild   500
&lt;/IfModule>
</pre>
<p> While &ldquo;fanatical&rdquo; sounds a little strong, it&rsquo;s not his job to help me configure Apache. Jordan didn&rsquo;t provide a lot of trouble shooting, but the links he provided nudged me in the right direction. Before following these links I was in the frustrating position of not even knowing enough to ask (or google) the right questions. Now, I can get back to making things.</p>
