---
title: What the heck is Stow!?
description: "Stow probably solves a problem that you have."
pubDate: 2024-05-08 22:31:00 -0400
permalink: stow
categories:
  - code
tags:
  - Left Brain
  - Unix
  - Linux
---

Sometimes 1000 words doesn't paint a very good picture.

> GNU Stow is a symlink farm manager which takes distinct sets of software
> and/or data located in separate directories on the filesystem, and makes them
> all appear to be installed in a single directory tree.

I did not read this captivating description and fall in love with stow.
I stumbled into it by way of trying to solve a problem. A few months back, I
overhauled my [dotfiles](https://github.com/RyanParsley/dotfiles) and
accidentally learned about this new to me tool. I watched a video on
[developer productivity](https://frontendmasters.com/courses/developer-productivity/)
by [ThePrimeagen](https://www.youtube.com/@ThePrimeagen) and he showed me the
way of stow. He makes a lot of great points in that video, but the most
profound impact on my workflow was learning about stow.

## This steak deserves more sizzle

Here is the thing about that description, the importance of symlinks have to
resonate with you for it to _feel_ exciting. For me, symlinks were not a big
part of my workflow. So a symlink manager didn't seem to solve a problem that I
had. In retrospect, the "turns out" is that symlinks weren't part of my
workflow because they're kind of a pain to manage. Have you ever _needed_ a file
to live one place, but thought it would be more ergonomic if it lived someplace
else? You wanted a symlink, you just didn't realize it.

## What does this have to do with dotfiles?

I don't want my home directory in source control, not all of it. But some things
that live in, or near, my home directory would be great to have in source control.
Stow allows me to designate a folder to be the home to my source controlled
files. I happen to have that directory in my repo, but it could be anywhere. I
can then, effectively, hoist them up to where my OS expects them to be via
`stow .`.

I could _theoretically_ set my home directory up as a git repository and
maintain git ignore rules to get a similar effect. But that sounds like a pain
to maintain. It is way more more ergonomic and less error prone for me to keep
all of the dotfiles in a folder and set that folder up as a repo. This is the
problem that symlinks solve and is a great opportunity for stow to shine.

## So, how does this work?

A simplified slice of my home directory could look like this.

```bash
~/
  ├── .zshrc # symlink to .dotfiles/.zshrc
  └── .dotfiles/
      ├── .git/
      └── .zshrc # actual file
```

From inside my `~/.dotfiles/` directory, I can run `stow .` to create and
maintain symlinks to the files within this directory. Any modifications done to
these files are immediately reflected in the appropriate place. I _just_ have to
remember to create new files in the sub directory and stow them instead of
creating them in the default directory.

## What other problems might it solve?

I'm thinking about reworking my notes directory. It's a folder full of markdown
that I tend to view and edit via Obsidian. To wire this up to a static generator,
I'd need to introduce all sorts of dependencies (node_modules, book.toml...
stuff that is not markdown) that would muck up the editing experience of my notes.
With stow, it seems reasonable to tend to a static site repo in one place while
I care for and feed my notes in another directory. But that, is another post for
another day.

## References

- [Stow's manual](https://www.gnu.org/software/stow/manual/stow.html)
