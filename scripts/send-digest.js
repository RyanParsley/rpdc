/**
 * Weekly Digest Generator
 *
 * Collects blog posts, notes, and ephemera from the past week,
 * generates a Markdown digest, and sends it via Buttondown API.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://ryanparsley.com";

// Configuration
const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;
const BUTTONDOWN_API_URL = "https://api.buttondown.com/v1";

if (!BUTTONDOWN_API_KEY) {
  console.error("❌ BUTTONDOWN_API_KEY environment variable is required");
  process.exit(1);
}

/**
 * Get all markdown files from a directory recursively
 */
function getMarkdownFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};

  const frontmatter = {};
  const lines = frontmatterMatch[1].split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Handle arrays like: [posse, indieWeb, typeScript]
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^#/, ""));
    }

    frontmatter[key] = value;
  }

  return frontmatter;
}

/**
 * Get the publish/creation date from a file path or frontmatter
 */
function getDateFromFile(filePath, frontmatter) {
  // Try frontmatter first
  if (frontmatter.pubDate) {
    const date = new Date(frontmatter.pubDate);
    if (!isNaN(date.getTime())) return date;
  }
  if (frontmatter.date) {
    const date = new Date(frontmatter.date);
    if (!isNaN(date.getTime())) return date;
  }

  // Try parsing from filename (e.g., 2026-02-28-hello-faircamp.md)
  const fileName = path.basename(filePath, path.extname(filePath));
  const dateMatch = fileName.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    return new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
  }

  // Fall back to file modification time
  return new Date(fs.statSync(filePath).mtime);
}

/**
 * Extract title from markdown content
 */
function getTitleFromContent(content, filePath) {
  // Try frontmatter
  const frontmatter = parseFrontmatter(content);
  if (frontmatter.title) return frontmatter.title;

  // Try first h1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1];

  // Fall back to filename
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Get description from frontmatter or content
 */
function getDescription(content) {
  const frontmatter = parseFrontmatter(content);
  if (frontmatter.description) return frontmatter.description;

  // Try to extract first paragraph after frontmatter
  const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, "");
  const paragraphs = withoutFrontmatter.split(/\n\n+/);
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.length > 20) {
      // Remove markdown formatting
      return trimmed.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`#]/g, "");
    }
  }

  return "";
}

/**
 * Get tags from frontmatter
 */
function getTags(frontmatter) {
  if (!frontmatter.tags) return [];
  if (Array.isArray(frontmatter.tags)) return frontmatter.tags;
  if (typeof frontmatter.tags === "string") {
    return frontmatter.tags
      .replace(/[\[\]]/g, "")
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""));
  }
  return [];
}

/**
 * Build URL from file path
 */
function filePathToUrl(filePath, baseType) {
  const relative = path.relative(
    path.join(__dirname, "../src/content"),
    filePath
  );

  // Handle nested paths like blog/2025/2025-08-31-posse-astro-integration.md
  const withoutExt = relative.replace(/\.(md|mdx)$/, "");
  return `${SITE_URL}/${baseType}/${withoutExt}`;
}

/**
 * Format date for display
 */
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Collect content from past week
 */
async function collectWeeklyContent() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const content = {
    blog: [],
    note: [],
    ephemera: [],
  };

  // Collect blog posts
  const blogFiles = getMarkdownFiles(
    path.join(__dirname, "../src/content/blog")
  );
  for (const file of blogFiles) {
    const fileContent = fs.readFileSync(file, "utf-8");
    const frontmatter = parseFrontmatter(fileContent);
    const date = getDateFromFile(file, frontmatter);

    if (date >= oneWeekAgo) {
      content.blog.push({
        title: getTitleFromContent(fileContent, file),
        url: filePathToUrl(file, "blog"),
        date,
        description: getDescription(fileContent),
        tags: getTags(frontmatter),
        type: "blog",
      });
    }
  }

  // Collect notes
  const noteFiles = getMarkdownFiles(
    path.join(__dirname, "../src/content/note")
  );
  for (const file of noteFiles) {
    // Skip subdirectories that are treated as collections (violin, mpcnc, etc.)
    const relative = path.relative(
      path.join(__dirname, "../src/content/note"),
      file
    );
    if (relative.includes("/")) continue;

    const fileContent = fs.readFileSync(file, "utf-8");
    const frontmatter = parseFrontmatter(fileContent);
    const date = getDateFromFile(file, frontmatter);

    if (date >= oneWeekAgo) {
      content.note.push({
        title: getTitleFromContent(fileContent, file),
        url: filePathToUrl(file, "note"),
        date,
        description: getDescription(fileContent),
        tags: getTags(frontmatter),
        type: "note",
      });
    }
  }

  // Collect ephemera
  const ephemeraFiles = getMarkdownFiles(
    path.join(__dirname, "../src/content/ephemera")
  );
  for (const file of ephemeraFiles) {
    const fileContent = fs.readFileSync(file, "utf-8");
    const frontmatter = parseFrontmatter(fileContent);
    const date = getDateFromFile(file, frontmatter);

    if (date >= oneWeekAgo) {
      // Ephemera uses slug as title if no title in frontmatter
      const slug = path.basename(file, path.extname(file));
      content.ephemera.push({
        title: frontmatter.title || slug,
        url: filePathToUrl(file, "ephemera"),
        date,
        description: getDescription(fileContent),
        tags: getTags(frontmatter),
        type: "ephemera",
      });
    }
  }

  return content;
}

/**
 * Generate Markdown digest
 */
function generateMarkdownDigest(content) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const dateRange = `${formatDate(weekStart)} - ${formatDate(now)}`;

  let markdown = `📝 **Weekly Digest**
================

${dateRange}
`;

  // Blog posts
  if (content.blog.length > 0) {
    markdown += `\n## 📌 Blog\n`;
    for (const item of content.blog) {
      markdown += `\n### [${item.title}](${item.url})\n`;
      markdown += `*blog* • ${formatDate(item.date)}\n`;
      if (item.description) {
        markdown += `\n${item.description}\n`;
      }
      if (item.tags.length > 0) {
        markdown += `\nTags: ${item.tags.map((t) => `#${t}`).join(", ")}\n`;
      }
      markdown += `\n---\n`;
    }
  }

  // Notes
  if (content.note.length > 0) {
    markdown += `\n## 📌 Note\n`;
    for (const item of content.note) {
      markdown += `\n### [${item.title}](${item.url})\n`;
      markdown += `*note* • ${formatDate(item.date)}\n`;
      if (item.description) {
        markdown += `\n${item.description}\n`;
      }
      if (item.tags.length > 0) {
        markdown += `\nTags: ${item.tags.map((t) => `#${t}`).join(", ")}\n`;
      }
      markdown += `\n---\n`;
    }
  }

  // Ephemera
  if (content.ephemera.length > 0) {
    markdown += `\n## 📌 Ephemera\n`;
    for (const item of content.ephemera) {
      markdown += `\n### [${item.title}](${item.url})\n`;
      markdown += `*ephemera* • ${formatDate(item.date)}\n`;
      if (item.description) {
        markdown += `\n${item.description}\n`;
      }
      markdown += `\n---\n`;
    }
  }

  // Footer
  markdown += `\nThis weekly digest is automatically generated from my blog, notes, and ephemera. [Visit ryanparsley.com](${SITE_URL}) to read more.\n`;

  return markdown;
}

/**
 * Send email via Buttondown API
 */
async function sendEmail(subject, body) {
  const response = await fetch(`${BUTTONDOWN_API_URL}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Token ${BUTTONDOWN_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "RyanParsleyDotCom/1.0",
    },
    body: JSON.stringify({
      subject,
      body,
      email_type: "public",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Buttondown API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Main function
 */
async function main() {
  console.log("📝 Starting weekly digest generation...\n");

  try {
    // Collect content from past week
    console.log("🔍 Collecting content from the past week...");
    const content = await collectWeeklyContent();

    const totalItems =
      content.blog.length + content.note.length + content.ephemera.length;

    console.log(
      `   Found ${content.blog.length} blog posts, ${content.note.length} notes, ${content.ephemera.length} ephemera\n`
    );

    // Skip if no content
    if (totalItems === 0) {
      console.log("📭 No new content this week. Skipping email.\n");
      return;
    }

    // Generate digest
    console.log("📄 Generating Markdown digest...");
    const body = generateMarkdownDigest(content);

    // Generate subject line
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const subject = `Weekly Digest: ${weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;

    console.log(`   Subject: ${subject}\n`);

    // Send email
    console.log("🚀 Sending email via Buttondown API...");
    const result = await sendEmail(subject, body);

    console.log(`✅ Email sent successfully!`);
    console.log(`   Email ID: ${result.id}`);
    console.log(`   URL: ${result.absolute_url}\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();