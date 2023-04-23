---
title: Styleguide Thoughts
description: "A properly leveraged styleguide can be a great communication tool between designer and developers."
pubDate: 2017-01-17 16:47:00 -0400
---

A properly leveraged styleguide can be a great communication tool between designer and developers. Furthermore, they can keep scope down by promoting reuse and ultimately keep a project's style more consistent. If not leveraged properly, they can be little more than a vestigial artfact. Here are a few things to think about to ensure you're not just going through the motions.

## Strategy

### We're making gears, not snowflakes.

- Focus on the fact that you're building a system and not a poster.
- Components should be stress tested early, not simply displayed in an idealized context
- Consider the best case scenario or ideal context
- Don't ignore the worst case scenario (it will happen)
- Example: How does the search result page look if there are no results or only 1? Don't simply think about when it has the same number of results as columns that you plan to use.
- Displaying high fidelity layouts is _necessary_ to a point. Be realisitic about that point.
- Layouts really only exist in a styleguide to test your components.
- Beyond that point, usefullness drops off drastically and producing them becomes wasteful busy work.
- The point of the excercise is to establish patterns. Deviate when needed, not at whim
- Have a solid reason to deviate from established patterns
- Communicate that reason

## Tactics

### Develop early, deploy often

- Focus on making it easier to reuse elements than to deviate from established patterns.
- Photoshop (styles and libraries?)
- Illustrator/ Sketch (symbols and styles)
- Code (partials or whatever your framework of choice calls such modular components)
- Create channels to communicate deviations from established guidelines.
- Is this deviation an oversite?
- Is it a proposition to update the guidelines globally?
- Is this instance unique for some reason warranting an exception
- Only populate as many layouts as you need to evaluate contexts for components ot exist within.
- Layout a blog post... don't layout all the blog posts
- The number of unique layout conditions should be pretty small
- Do this in code, not photoshop (Content placement in Photoshop tends to be a waste of time and sets bogus expectations).
