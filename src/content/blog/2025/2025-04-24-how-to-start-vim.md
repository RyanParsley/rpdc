---
title: How To Start Vim
description: People joke about how Vim is hard to quit, but I want to make it easier to start. Here is a collection of resources to help demystify Vim.
pubDate: 2025-04-24
updatedDate: 2025-04-24
categories: [writing, code]
tags: [neovim, vim, code, dotfiles]
---

People joke about how Vim is hard to quit, but I want to make it easier to
_start_. Here is a collection of resources that I believe demystify Vim to great
effect.

## Why to Vim?

Personally, I prefer Vim to IDEs because I'm gradually building up
complexity that I mostly understand. Even if I largely copy/paste default
configurations, I'm selecting each plugin intentionally. As such, I don't tend
to use the richer distro-like config options like AstroNvim or LazyVim. I
think they're great and will poke through their docs for inspiration. However, I
want my config to be based on _my_ opinions and enjoyed largely building from
the ground up.

That's why I'd recommend [kickstart](https://github.com/nvim-lua/kickstart.nvim)
as a config jumping off point. It's less opinionated about what plugins you use
and more about teaching you what these hard to search concepts are. I say hard
to search because if you don't know that an
[LSP](https://microsoft.github.io/language-server-protocol/) is what drives your
autocomplete... it's hard to search LSP. Beyond the wonderfully documented code
found in the kickstart repo, TJ has a very accessible [youtube
video](https://www.youtube.com/watch?v=m8C0Cq9Uv9o) to introduce you to the
philosophy and tools.

## What is the deal with Neovim!?

I switched to Neovim back in the Vim 7 era when there were more good reasons to
do so than there are now. After Vim 8 incorporated many downstream improvements,
my primary reason for sticking with Neovim became Lua support. Or more
precisely, my reason was to avoid Vimscript.

I didn't care to get good at a language that was only applicable in one narrow
context. There are other (arguably better) reasons to use Neovim but Lua is
enough for me (and I'm not even good at it).

## This is my config. There are many like it, but this one is mine.

I don't advocate that you fork my repo and use it "as-is", but I offer [my
dotfiles](https://codeberg.org/RyanParsley/dotfiles/src/branch/main/nvim/.config/nvim/lua/plugins)
in the event any part of them may spark curiosity. I do advocate that you share
your dotfiles if you don't already. If that's a new to you journey, you may want
to check out my [post about Stow](https://ryanparsley.com/blog/stow) to make
that more ergonomic.

## You got this!

Vim can be intimidating because it's clearly a deep rabbit hole full of
wonderfully wacky yaks to shave. Relax, it's _just_ a text editor. Kickstart
knocks down a few rough edges to make for a more ergonomic starting point. You
don't _need_ to understand all the concepts of Vim as a prerequisite to
starting. I suspect there's a ton about your current editor that you don't know
and you're fine with that. Get a little better every day and when you don't like
how your workflow feels, change it.
