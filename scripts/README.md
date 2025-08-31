# Astro Content Generation Scripts

This directory contains helper scripts for generating new content following Astro content collection conventions.

## Available Scripts

### `new-blog-post.js`

A simple script for generating blog posts.

```bash
npm run new-post
# or
node scripts/new-blog-post.js
```

**Features:**

- Interactive prompts for title, description, and tags
- Automatic slug generation
- Proper frontmatter formatting
- Follows blog content collection schema

### `new-content.js`

A comprehensive script for generating different types of content (blog, note, ephemera).

```bash
npm run new-content
# or
npm run new-content -- --type blog
npm run new-content -- --type note
npm run new-content -- --type ephemera
# or
node scripts/new-content.js
node scripts/new-content.js --type=blog
```

**Features:**

- Supports all content types (blog, note, ephemera)
- Interactive prompts tailored to each content type
- Automatic directory structure creation for ephemera
- Proper frontmatter generation for each schema
- Template content generation

## Content Types

### Blog Posts

- **Path:** `src/content/blog/`
- **Schema:** Requires `title`, `description`, `pubDate`
- **Optional:** `tags`, `OGImage`, `heroImage`, `featured`
- **Filename:** `YYYY-MM-DD-slug.md`

### Notes

- **Path:** `src/content/note/`
- **Schema:** Requires `title`, `description`, `pubDate`
- **Optional:** `tags`, `OGImage`, `heroImage`
- **Filename:** `YYYY-MM-DD-slug.md`

### Ephemera

- **Path:** `src/content/ephemera/YYYY/MM/`
- **Schema:** Requires `date`
- **Optional:** `syndication`, `youtube`, `image`
- **Filename:** `DD.md`

## Usage Examples

### Creating a Blog Post

```bash
npm run new-content
# Select "blog" when prompted
# Enter title, description, and tags
```

### Creating Ephemera

```bash
npm run new-content -- --type ephemera
# Enter content and optional image/YouTube info
```

### Creating a Note

```bash
npm run new-content -- --type note
# Enter title, description, and tags
```

## Generated Frontmatter

### Blog Post Example

```yaml
---
title: "My Blog Post Title"
description: "A description of the blog post"
pubDate: "2025-08-31"
tags: ["tag1", "tag2", "tag3"]
---
# My Blog Post Title

Content goes here...
```

### Ephemera Example

```yaml
---
date: "2025-08-31"
image:
  src: "/images/example.jpg"
  alt: "Example image"
---
Ephemera content goes here...
```

## File Structure

After running the scripts, your content will be organized as follows:

```
src/content/
├── blog/
│   ├── 2025/
│   │   ├── 2025-08-31-my-blog-post.md
│   │   └── 2025-09-15-another-post.md
│   └── 2024/
│       └── 2024-12-25-christmas-post.md
├── note/
│   ├── 2025-08-31-my-note.md
│   └── ...
└── ephemera/
    ├── 2025/
    │   └── 08/
    │       └── 31.md
    └── ...
```

**Note:** Blog posts are automatically organized into year folders (e.g., `2025/`, `2024/`) for better organization, while notes and ephemera follow their standard structures.

## Next Steps

After generating content:

1. **Edit the generated file** to add your content
2. **Add images** to the `public/` directory if needed
3. **Run the build** to test: `npm run build`
4. **Commit and push** your changes

## Tips

- **Slugs are automatically generated** from titles
- **Dates are automatically set** to today's date
- **Tags should be comma-separated** when prompted
- **Ephemera creates subdirectories** automatically (YYYY/MM/)
- **All scripts validate** that files don't already exist

## Troubleshooting

- **File already exists**: Choose a different title or modify the existing file
- **Build errors**: Check that your frontmatter matches the content collection schema
- **Missing fields**: The scripts will prompt for all required fields

---

_These scripts follow Astro's content collection conventions and ensure consistency across your blog._
