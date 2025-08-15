---
title: Codeberg Pages via Pipeline
description: |
  I found the docs a little tricky so I dropped these breadcumbs to 
  show how simple ci driven content updates can be with codeberg and friends.
pubDate: 2025-08-15
updatedDate: 2025-08-15
featured: true
tags:
  - note
  - codeberg
  - indieWeb
---

I've been evaluating codeberg as a github alternative and collected notes on
how pipelines and pages work on codeberg. I have a working demonstration in [this
repo](https://codeberg.org/RyanParsley/codeberg-notes) and I'll annotate the
various parts below.

While the [official documentation](https://docs.codeberg.org/codeberg-pages/) eventually got
me to where I needed, I think I can lay out a more direct path here.
[This documentation](https://codeberg.page/) made it look like the process would
be more manual/ static than it has to be.

This [blog
post](https://cjerrington.codeberg.page/eleventy-base-blog-site/blog/codebergpagesbuild/)
looked good, but I was able to do something simpler with [this plugin](https://woodpecker-ci.org/plugins/Codeberg%20Pages%20Deploy).

## Keep it simple

This [plugin](https://woodpecker-ci.org/plugins/Codeberg%20Pages%20Deploy) makes
the process pretty trivial. With it, you simply make your site and set the
target directory in the config.

### SSG based on node

```yaml
# .woodpecker/build.yml
steps:
  - name: build
    when:
      event: [push, pull_request]
    image: node
    commands:
      - npm ci
      - npm run build
  - name: deploy
    image: codeberg.org/xfix/plugin-codeberg-pages-deploy:1
    settings:
      folder: docs
      ssh_key:
        from_secret: ssh_key
```

### SSG built with mdbook (Rust)

```yaml
steps:
  - name: build
    when:
      event: [push, pull_request]
    image: rust
    commands:
      - curl -L --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh | bash
      - cargo binstall mdbook
      - mdbook build
  - name: deploy
    image: codeberg.org/xfix/plugin-codeberg-pages-deploy:1
    settings:
      folder: book
      ssh_key:
        from_secret: ssh_key
```

That curl command comes from [binstall
documentation](https://github.com/cargo-bins/cargo-binstall)
