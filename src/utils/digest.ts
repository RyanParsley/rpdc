/**
 * Weekly digest utilities for collecting and formatting content
 */

import { getCollection } from "astro:content";

// Types for digest content
export interface DigestItem {
	title: string;
	url: string;
	description?: string;
	date: Date;
	type: "blog" | "note" | "ephemera";
	tags?: string[] | undefined;
}

export interface WeeklyDigest {
	weekStart: Date;
	weekEnd: Date;
	items: DigestItem[];
	totalItems: number;
	blogCount: number;
	noteCount: number;
	ephemeraCount: number;
}

/**
 * Get content from the past week
 */
export async function getWeeklyContent(): Promise<DigestItem[]> {
	const now = new Date();
	const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const [blogPosts, notes, ephemera] = await Promise.all([
		getCollection("blog"),
		getCollection("note"),
		getCollection("ephemera"),
	]);

	const allItems: DigestItem[] = [];

	// Process blog posts
	blogPosts.forEach((post) => {
		const publishDate = post.data.pubDate; // Already transformed to Date by schema
		if (publishDate >= oneWeekAgo && publishDate <= now) {
			allItems.push({
				title: post.data.title,
				url: `/blog/${post.slug}`,
				description: post.data.description,
				date: publishDate,
				type: "blog",
				tags: post.data.tags,
			});
		}
	});

	// Process notes
	notes.forEach((note) => {
		const publishDate = note.data.pubDate; // Already transformed to Date by schema
		if (publishDate >= oneWeekAgo && publishDate <= now) {
			allItems.push({
				title: note.data.title,
				url: `/note/${note.slug}`,
				description: note.data.description,
				date: publishDate,
				type: "note",
				tags: note.data.tags,
			});
		}
	});

	// Process ephemera
	ephemera.forEach((item) => {
		const publishDate = item.data.date; // Already transformed to Date by schema
		if (publishDate >= oneWeekAgo && publishDate <= now) {
			// Ephemera might not have title/description/tags, so we generate them
			const title = item.data.youtube
				? `YouTube Video: ${item.slug}`
				: item.data.syndication?.[0]?.title || `Ephemera: ${item.slug}`;

			allItems.push({
				title,
				url: `/ephemera/${item.slug}`,
				description: item.data.youtube
					? "YouTube video content"
					: "Shared content and links",
				date: publishDate,
				type: "ephemera",
				tags: [], // Ephemera doesn't have tags in schema
			});
		}
	});

	// Sort by date (newest first)
	return allItems.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Generate weekly digest data
 */
export async function generateWeeklyDigest(): Promise<WeeklyDigest> {
	const items = await getWeeklyContent();
	const now = new Date();
	const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const blogCount = items.filter((item) => item.type === "blog").length;
	const noteCount = items.filter((item) => item.type === "note").length;
	const ephemeraCount = items.filter((item) => item.type === "ephemera").length;

	return {
		weekStart: oneWeekAgo,
		weekEnd: now,
		items,
		totalItems: items.length,
		blogCount,
		noteCount,
		ephemeraCount,
	};
}

/**
 * Format digest as HTML email
 */
export function formatDigestAsHtml(digest: WeeklyDigest): string {
	const formatDate = (date: Date) =>
		date.toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});

	const weekRange = `${formatDate(digest.weekStart)} - ${formatDate(digest.weekEnd)}`;

	let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Weekly Digest</title>
</head>
<body>
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #2e3440; color: #eceff4; padding: 20px;">
  <div style="background: #3b4252; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: #88c0d0; margin: 0 0 10px 0; font-size: 24px;">📝 Weekly Digest</h1>
     <p style="color: #d8dee9; margin: 0;"><strong>${weekRange}</strong></p>
  </div>
	`;

	if (digest.items.length === 0) {
		html += `
<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #4c566a; border-radius: 5px; background: #3b4252;">
  <p style="margin: 0; color: #e5e9f0;">📭 No new content this week. Check back next time!</p>
</div>
 		`;
	} else {
		// Group items by type
		const groupedItems = digest.items.reduce(
			(acc, item) => {
				if (!acc[item.type]) acc[item.type] = [];
				acc[item.type]!.push(item);
				return acc;
			},
			{} as Record<string, DigestItem[]>,
		);

		Object.entries(groupedItems).forEach(([type, items]) => {
			const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
			html += `<h2 style="color: #88c0d0; font-size: 18px; margin: 30px 0 15px 0; border-bottom: 1px solid #4c566a; padding-bottom: 5px;">📌 ${typeLabel}</h2>`;

			items.forEach((item) => {
				const typeColors = {
					blog: {
						bg: "rgba(136, 192, 208, 0.2)",
						color: "#88c0d0",
						border: "rgba(136, 192, 208, 0.3)",
					},
					note: {
						bg: "rgba(129, 161, 193, 0.2)",
						color: "#81a1c1",
						border: "rgba(129, 161, 193, 0.3)",
					},
					ephemera: {
						bg: "rgba(163, 190, 140, 0.2)",
						color: "#a3be8c",
						border: "rgba(163, 190, 140, 0.3)",
					},
				};
				const colors =
					typeColors[item.type as keyof typeof typeColors] || typeColors.blog;

				html += `
<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #4c566a; border-radius: 5px; background: #3b4252;">
  <h3 style="margin: 0 0 8px 0; font-size: 16px;">
    <a href="${process.env.SITE_URL || "https://ryanparsley.com"}${item.url}" style="color: #88c0d0; text-decoration: none;">${item.title}</a>
  </h3>
  <div style="color: #d8dee9; font-size: 12px; margin-bottom: 8px;">
    <span style="background: ${colors.bg}; color: ${colors.color}; padding: 2px 6px; border-radius: 3px; margin-right: 8px;">${type}</span>
    <span>${formatDate(item.date)}</span>
  </div>
  ${item.description ? `<p style="color: #e5e9f0; margin: 8px 0; line-height: 1.4;">${item.description}</p>` : ""}
  ${item.tags && item.tags.length > 0 ? `<div style="margin-top: 8px;">${item.tags.map((tag) => `<span style="background: #434c5e; color: #88c0d0; padding: 2px 4px; border-radius: 3px; font-size: 11px; margin-right: 4px;">#${tag}</span>`).join("")}</div>` : ""}
</div>
  				`;
			});
		});
	}

	html += `
<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #4c566a; text-align: center; color: #d8dee9; font-size: 12px;">
  <p style="margin: 0;">
    This weekly digest is automatically generated from my blog, notes, and ephemera.<br>
    <a href="${process.env.SITE_URL || "https://ryanparsley.com"}" style="color: #81a1c1; text-decoration: none;">Visit ryanparsley.com</a> to read more.
  </p>
</div>
</div>
</body>
</html>
 	`;

	return html;
}

/**
 * Format digest as plain text email
 */
export function formatDigestAsText(digest: WeeklyDigest): string {
	const formatDate = (date: Date) =>
		date.toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});

	const weekRange = `${formatDate(digest.weekStart)} - ${formatDate(digest.weekEnd)}`;

	let text = `📝 WEEKLY DIGEST\n`;
	text += `================\n\n`;
	text += `${weekRange}\n\n`;

	text += `═══════════════════════════════════════════════\n\n`;

	if (digest.items.length === 0) {
		text += `📭 No new content this week.\n\n`;
	} else {
		// Group items by type
		const groupedItems = digest.items.reduce(
			(acc, item) => {
				if (!acc[item.type]) acc[item.type] = [];
				acc[item.type]!.push(item);
				return acc;
			},
			{} as Record<string, DigestItem[]>,
		);

		Object.entries(groupedItems).forEach(([type, items]) => {
			const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
			text += `📌 ${typeLabel.toUpperCase()}\n`;
			text += `${"-".repeat(typeLabel.length + 2)}\n\n`;

			items.forEach((item) => {
				text += `${item.title}\n`;
				text += `${process.env.SITE_URL || "https://ryanparsley.com"}${item.url}\n`;
				text += `${formatDate(item.date)}\n`;
				if (item.description) {
					text += `${item.description}\n`;
				}
				if (item.tags && item.tags.length > 0) {
					text += `Tags: ${item.tags.map((tag) => `#${tag}`).join(", ")}\n`;
				}
				text += `\n`;
			});
		});
	}

	text += `---\n`;
	text += `This weekly digest is automatically generated from my blog, notes, and ephemera.\n`;
	text += `Visit ${process.env.SITE_URL || "https://ryanparsley.com"} to read more.\n`;

	return text;
}
