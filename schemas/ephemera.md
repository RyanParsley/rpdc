---
_schema: _schema
title:
  type: string
  label: Title
  comment: Optional title for the ephemera post
date:
  type: datetime
  label: Date
  comment: Publication date (defaults to file creation date)
image:
  type: file
  label: Image
  comment: Optional image for the post
image_alt:
  type: string
  label: Image Alt Text
  comment: Alternative text for the image (for accessibility)
syndication:
  type: array
  label: Syndication Links
  comment: Links to syndicated versions on social media platforms
  items:
    type: object
    properties:
      href:
        type: url
        label: URL
        comment: The URL of the syndicated post
      title:
        type: string
        label: Platform
        comment: Name of the platform (e.g., Mastodon, Bluesky)
---

# Ephemera Post

This is a short-form post that will be automatically syndicated to social media platforms.

## Content

Write your ephemera content here in Markdown format. This will be posted to Mastodon and/or Bluesky depending on your configuration.

## Syndication

After publishing, syndication links will be automatically added to the frontmatter above.
