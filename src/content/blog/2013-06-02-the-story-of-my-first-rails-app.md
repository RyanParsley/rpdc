---
title: The story of my first Rails app
description: ""
pubDate: 2013-06-02
tags:
  - Confabulation
  - Left Brain
---

I’ve been using Ruby for a little while now. Mostly, making little tools to automate bits of my workflow. Each time client work came up, I’d “chicken out” and build it with Drupal. Here’s the story about how I accidentally made my first Rails app.

## The devils I knew

Drupal may not be the most efficient way to solve some problems, but I’m rather familiar with it. Also, I’ve hosted many php sites over the last decade. It is pretty much a “it just works” situation. When I’m tackling a web project solo, I tend to stick with Drupal, for just that reason.

Recently, I was tasked with enabling someone to make html emails. The rub was, she didn’t know html and had no desire to change that. Ultimately, the approach we decided on was a static site generator living locally. The app would compile a folder full of markdown files into a single html document with the proper styles injected inline.

It made sense for it to not be a web app. She already wrote here content locally in a plain text friendly manor. She’d then throw that over the wall for someone to convert it to html. Now, she could simply run a command that would eliminate the need of a human to do that conversion. Then, she could paste the code that the app yielded into the web app that delivers the email. I spent a couple of days configuring Middleman and thought I had a pretty nice solution.

## It worked on my box

I sit down to her iMac and type “gem install bundler”. All was well. It wasn’t until I typed “bundle install” that the problems started. First off, can you believe she didn’t have Xcode installed!? After discovering a handful more of missing resources, I could tell she was not comfortable with all the command line fidgeting. I needed to host this tool as a web app.

## Is Rails appropriate?

At first, I thought Rails was overkill. However, the more I thought about it, the more this app needed. She was not keen on learning how to FTP, let alone use Git to transfer files to a server, so I needed to hook it up to a database instead of text files. If it’s out there on Heroku, I’ll need some sort of log in system. After a few rounds of “If you give an app a cookie”, I decided that Rails was probably the path of least resistance for me. I could add all the missing bits to Sinatra, but what’s the point in that?

## Square 1 is not square 0

I started building a fresh app, but I was still able to use much from my static site generator code. It was written in Ruby, after all, so much of the logic ported over directly. The templates were in Haml, so that was no problem either. Ultimately, it was a rather smooth transition and I had the site up and running in less than a week.

So, I was seduced into making my first Rails app for a client. It was not completely without issue, but what project is? Now that I’ve traversed the divide from zero to one, I look forward to creating more Rails apps.
