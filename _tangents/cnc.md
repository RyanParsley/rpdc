---
title: CNC Router
excerpt: >-
  In an effort to better understand how CNC Routers work, I decided to build one
  from scratch.
header:
  image: /assets/images/tangents/cnc/cnc_helloworld.jpg
  teaser: /assets/images/tangents/cnc/cnc_helloworld.jpg
gallery:
  - url: /assets/images/tangents/cnc/cnc_dvd.jpg
    image_path: assets/images/tangents/cnc/cnc_dvd.jpg
    alt: Initial proof of concept
  - url: /assets/images/tangents/cnc/cnc_version2.jpg
    image_path: assets/images/tangents/cnc/cnc_version2.jpg
    alt: Upgraded to bigger platform and motors
  - url: /assets/images/tangents/cnc/cnc_final.jpg
    image_path: assets/images/tangents/cnc/cnc_final.jpg
    alt: Final version
---

In an effort to better understand how CNC Routers work, I decided to build onefrom scratch. Having little confidence that I could pull it off, I came up witha plan to break it up into smaller wins.

{% include gallery caption="Evolution of a DIY CNC from scratch." %}

The first step was to build a CNC mostly out of reclaimed electronics. I learnedthat the motors in many cd rom drives are stepper motors, so I took apart someold computers I had access to. For this build, I only needed to purchase 3stepper motor drivers and an Arduino.

With this success, I had the confidence to buy some NEMA 17 motors and scale thebuild up. This build worked mostly fine, but the motors would occasionally stickand I got the feeling my naive design was to blame. About that time, I hadpurchased a 3D Printer and decided to put it to work for me. A little researchrevealed the [MaduixaCNC](https://www.thingiverse.com/thing:989593).