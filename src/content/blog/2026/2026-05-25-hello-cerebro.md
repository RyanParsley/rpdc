---
title: Hello Cerebro
description: >-
  Introducing a tool to reduce cognitive load of when context switching between
  many side projects. For when minimalism isn't your style.
pubDate: '2026-05-25'
tags:
  - ai
  - tools
  - rust
  - notes
categrories:
  - code
syndication:
  - href: 'https://mastodon.social/@RyanParsley/117182045877168891'
    title: Mastodon
---

I want to introduce a tool that I've been working on for a few weeks.
[Cerebro](https://codeberg.org/RyanParsley/cerebro) collects metadata about your
projects (git history, file system info, TODO comments) and writes markdown in a
designated folder. It's not a tool _for_ agentic workflows. It does relieve some
of the cognitive inflammation that results from increased use of LLMs. It's not
_for_ LLMs, it's for people that may or may not be using LLMs. Cerebro is a tool
to reduce cognitive load of "too many" side projects. For when minimalism isn't
your style.

## My workbench has always been messy

When I write code in my "freetime", I don't have deadlines or stakeholders. I
more or less give myself permission to follow my muse. The result tends to leave
me with little piles of half baked code here and there. This is not a problem in
and of itself. The point of this activity isn't shipping code, it's about
learning and tinkering. Sometimes, I would like to take inventory of my little
experiments and get a little more [cult of
done](https://medium.com/@bre/the-cult-of-done-manifesto-724ca1c2ff13) about it.
It does feel good to ship things.

## The funny thing about LLMs

I don't know if LLMs make me [more
productive](https://www.theregister.com/software/2025/07/11/ai-coding-tools-make-developers-slower-study-finds/1143832),
but I do find myself tinkering a lot more lately. Much of my tinkering involves
LLMs in one fashion or another. More than anything, I'm feeling a burden on my
attention because of that. While I am using LLMs, I'm not looking to just vibe
out slop. Many of my more recent projects have centered around learning how to
use LLMs to make high quality code. That means, I remain more at an
architectural meta level and am a bit removed from the implementation details.
The more casual relationship with this code means it's harder to connect with
the architecture.

Mario Zechner, creator of the Pi coding agent, referred to agents as "merchants
of complexity". I feel that in my bones. Now before you go and suggest some sort
of detox or intervention... the problem isn't the agents. Not really. And it
isn't my complete lack of discipline (is the thing I keep telling myself). The
problem is that I can't hold all that context in _my_ head. So, seeing I had a
problem of too many side projects I did the only [reasonable
thing](https://xkcd.com/927/) for an engineer, I started one more project.

## Enter cerebro

Cerebro is my attempt to reduce the re-entry tax. It watches my development
activity and builds a dashboard of sorts. The `cerebro build` command scrapes my
git history, AI session databases, and code for TODOs. It writes markdown files
to a designate location that I refer to as cortex. Cortex is just a folder of
markdown and all the data in it is otherwise accessible... but the ergonomics of
this dashboard are making a real difference.

## The experiment continues

At this point, it's been a little over a month and it seems like there's
something of value building in cerebro. I'm toying around with a naive MCP
server to expose cortex to harnesses. I don't know if I'll keep it around, but
when I ask an agent about one of my projects, it reads the same context I'd read
myself and that seems nice for grounding and sharing between projects. I also
have a skill that is aware of cortex and can make use of the cli that it seems
just as good. Time will tell if the MCP is worth maintaining. For now, I have it
and it plays nicely with opencode.

I'm not using Cerebro to write more code faster. I'm using it to connect with
what I already built. The pile gets maintained, not expanded. It's an effort to
reduce cognitive load when the need for context switching seems to be growing
at an increasing rate. It's a tool for humans that happens to play nice with
LLMs.
