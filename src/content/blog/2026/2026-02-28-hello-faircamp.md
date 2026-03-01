---
title: "Hello Faircamp"
description: "I want to share the story of wiring up a selfhosted music portfolio using Faircamp."
pubDate: "2026-02-28T23:53:00-05:00"
tags: ["music", "ssg", "homelab"]
---

This is the story of self-hosting a [music portfolio](https://music.ryanparsley.com/) in my homelab using [Faircamp](https://simonrepp.com/faircamp/). I doubt you are looking to set up exactly this project with exactly this tech stack, but I suspect sharing my journey will be useful in one way or another. All in all, the process is straightforward. Perhaps, seeing that will encourage you to try for yourself.

## What is Faircamp

I can't state it any better than the official documentation does:

> Point Faircamp to a folder hierarchy containing your audio files. Within
> minutes, Faircamp builds a complete website presenting your work. The
> resulting site requires no database, no programming, no maintenance, and is
> compatible with virtually every webhost on this planet.
> -- [Faircamp Landing Page](https://simonrepp.com/faircamp/)

While this post is about how I'm hosting Faircamp, it's transferable
to any static site (folder full of html) you my want to share with the world.

## What is even going on with your network?

I have a Raspberry Pi in my homelab. Nothing about this is uniquely suited to
that hardware though, anything you have will work just fine. It has a few
services running. All of them configured via Coolify, but I'm not going to use that today. To use that would get in the way of the slick minimal deploy workflow that Faircamp supports out of the box.

### How do I safely expose myself?

I don't want to make my local network any more public than I need to. Instead
of opening a port on my router, I'm going to make use of Cloudflare's Zero Trust Tunnel. At the time of writing, you can make use of this for free and it's a
user-friendly way to enable a local port to be accessible to the outside
world without having a static IP address. If all of that is Greek to you, no
problem, the point is you don't need to deal with any of it.

### DNS friction

Since this blog is hosted on CloudCannon, I have been using their DNS
configuration tool. It's the most convenient way to get a domain name pointing
at a site they host. The problem today is, it doesn't allow for me to do more
advanced things like wire up this Cloudflare tunnel. To enable that, I had to
move control of my domain name to Cloudflare. That went pretty smoothly because it's a well documented popular choice.

One gotcha that is easy to overlook is that the default CNAME for CloudCannon is `site.cloudcannon.com` but it does not work with Cloudflare and that needs to be changed to `orange-cloud.cloudcannon.com`.

#### Here's a snapshot of what I did in the abstract to get things working.

| Type  | Name  | Content                      |
| ----- | ----- | ---------------------------- |
| CNAME | \*    | orange-cloud.cloudcannon.com |
| CNAME | music | (tunnel hostname)            |

## Caddy as my web server

Thus far, all of the services being hosted on this computer are by way of docker containers. This means I didn't have any sort of web server installed directly on the Pi yet. I'm not super familiar with Caddy, but I went with it on this project over apache or nginx. It seems modern and light-weight and it did _just work_ for me. Here is the entirety of my config (`/etc/caddy/Caddyfile`).

```json
:1337 {
    root * /opt/music-site
    file_server
    handle_errors {
        respond “{err.status_code}“
    }
}
```

In that code snippet, `opt` is the location I decided to place my static site.
Historically, `var/www` is pretty idiomatic place for static html, but it also
kind of suggests to me that you're using Apache. Services seem more appropriate in `opt` and I am planning to set some up in Caddy soon. Considering I'm planning to serve up some rust services soon, I'm going to standardize on `opt` for all the things that Caddy cares about on this computer. The choice is debatable. At the same time, the stakes couldn't be lower.

Another thing to note, if you're just getting started with Caddy, is you want to
use the service for this. Don't start Caddy on your server with `caddy
anything`. You want to run `sudo systemctl enable caddy`. That way, the web server is started every time your computer is.

## What does deployment look like?

Faircamp builds the site locally and even handles deployment with the following arguments.

```bash
faircamp -d --deploy-destination user@raspberrypi:/opt/music-site/
```

This works by way of rsync so you'll need all the typical permission stuff set
up for this to work smoothly. I already had an ssh key established to avoid
needing a password each time.

The only thing I had to do was give my user access to the opt folder. You'll
likely see the same issue as this the `opt` folder is locked down by default.
Here are my settings, yours will be different unless many fantastic coincidences line up.

```bash
sudo chown -R ryan:ryan /opt/music-site
```

## Tada

And that's how I served up a collection of music I made via a Raspberry Pi. The
state of the web is in a funny place where we just keep heaping complexity on
top of abstractions. The idea of having a single binary run over a folder of
static files and rsyncing the result to a computer I own felt refreshing.
