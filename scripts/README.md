# Astro Content Generation Scripts

This directory contains helper scripts for generating new content following Astro content collection conventions.

## Available Scripts

### `new-content.js`

A comprehensive script for generating different types of content (blog, note, ephemera).

```bash
# Ergonomic shortcuts (recommended)
npm run new:blog
npm run new:note
npm run new:ephemera

# Full command
npm run new-content -- --type blog
npm run new-content -- --type note
npm run new-content -- --type ephemera

# Interactive mode
npm run new-content

# Direct execution
node scripts/new-content.js --type blog
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

- **Path:** `src/content/ephemera/YYYY/MM/DD/`
- **Schema:** Requires `date`
- **Optional:** `syndication`, `youtube`, `image`
- **Filename:** `YYYY-MM-DD-HH-MM-SS.md`

## Usage Examples

### Creating a Blog Post

```bash
# Quick shortcut (recommended)
npm run new:blog

# Or specify directly
npm run new-content -- --type blog

# Interactive mode
npm run new-content
# Select "blog" when prompted
```

### Creating Ephemera

```bash
# Quick shortcut (recommended)
npm run new:ephemera

# Or specify directly
npm run new-content -- --type ephemera
```

**Complete Workflow:**

- Content: "My daily photo"
- Include image? (y/n): y
- Image name: sunset.jpg
- Alt text: Beautiful sunset at the beach
- Open containing folder? (y/n): y

**Image Handling:**

- Include image? (y/n) - defaults to no
- If yes: Image name, then Alt text
- Values go directly to frontmatter
- Folder opening offered at the end

### Creating a Note

```bash
# Quick shortcut (recommended)
npm run new:note

# Or specify directly
npm run new-content -- --type note
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
    │       └── 31/
    │           └── 2025-08-31-14-30-45.md
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
- **Ephemera creates subdirectories** automatically (YYYY/MM/DD/)
- **Simple image handling** - just enter filename, image goes in same directory as markdown
- **Interactive by design** - works best when run directly, not with piped input
- **Use ergonomic shortcuts** like `npm run new:blog` for quick content creation
- **Use `npm run new-content`** for interactive mode or all content types
- **All scripts validate** that files don't already exist

## Troubleshooting

- **File already exists**: Choose a different title or modify the existing file
- **Build errors**: Check that your frontmatter matches the content collection schema
- **Missing fields**: The scripts will prompt for all required fields

---

_This script follows Astro's content collection conventions and ensures consistency across all content types (blog, note, ephemera)._
