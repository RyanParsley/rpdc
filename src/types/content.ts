/**
 * Content collection types inferred from Zod schemas
 * These types are automatically generated from the Zod schemas in config.ts
 * Following Astro conventions for type organization
 */

import { z } from "zod";

// ============================================================================
// Reusable Schema Components
// ============================================================================

const dateTransformer = (val: string | Date | number | undefined) =>
	val ? new Date(val) : new Date();

// Base schema for common fields
const baseSchema = {
	title: z.string(),
	description: z.string(),
	gallery: z
		.array(
			z.object({
				url: z.string(),
				alt: z.string(),
			}),
		)
		.optional(),
};

// Date fields schema
const dateFields = {
	pubDate: z.string().or(z.date()).or(z.number()).transform(dateTransformer),
	updatedDate: z
		.string()
		.optional()
		.or(z.date())
		.or(z.number())
		.transform(dateTransformer),
};

// ============================================================================
// Blog Collection Types
// ============================================================================

/**
 * Blog post frontmatter data type
 */
export type BlogData = z.infer<typeof blogSchema>;

/**
 * Complete blog post structure
 */
export type BlogPost = {
	id: string;
	slug: string;
	body: string;
	collection: "blog";
	data: BlogData;
};

// Define blog schema
export const blogSchema = z.object({
	...baseSchema,
	...dateFields,
	categories: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
	featured: z.boolean().optional(),
	author: z.string().optional(),
	thumb_image: z
		.object({
			image: z.string(),
			image_alt: z.string(),
		})
		.optional(),
	featured_image: z
		.object({
			image: z.string(),
			image_alt: z.string(),
		})
		.optional(),
	seo: z
		.object({
			page_description: z.string().optional(),
			canonical_url: z.string().optional(),
			featured_image: z.string().optional(),
			featured_image_alt: z.string().optional(),
			author_twitter_handle: z.string().optional(),
			open_graph_type: z.string().optional(),
			no_index: z.boolean().optional(),
		})
		.optional(),
	OGImage: z.any().optional(),
	heroImage: z.any().optional(),
});

// ============================================================================
// Draft Collection Types
// ============================================================================

/**
 * Draft frontmatter data type
 */
export type DraftData = z.infer<typeof draftSchema>;

/**
 * Complete draft structure
 */
export type DraftPost = {
	id: string;
	slug: string;
	body: string;
	collection: "draft";
	data: DraftData;
};

// Draft schema (extends blog with optional dates)
export const draftSchema = blogSchema.extend({
	pubDate: z
		.string()
		.or(z.date())
		.or(z.number())
		.transform(dateTransformer)
		.optional(),
	updatedDate: z
		.string()
		.optional()
		.or(z.date())
		.or(z.number())
		.transform(dateTransformer)
		.optional(),
	description: z.string().optional(),
});

// ============================================================================
// Ephemera Collection Types
// ============================================================================

/**
 * Ephemera frontmatter data type
 */
export type EphemeraData = z.infer<typeof ephemeraSchema>;

/**
 * Complete ephemera structure
 */
export type EphemeraPost = {
	id: string;
	slug: string;
	body: string;
	collection: "ephemera";
	data: EphemeraData;
};

// Ephemera schema
export const ephemeraSchema = z.object({
	date: z.string().or(z.date()).or(z.number()).transform(dateTransformer),
	syndication: z
		.array(z.object({ href: z.string(), title: z.string() }))
		.optional(),
	youtube: z.string().optional(),
	image: z
		.object({
			src: z.any(),
			alt: z.string(),
		})
		.optional(),
});

// ============================================================================
// Page Collection Types
// ============================================================================

/**
 * Page frontmatter data type
 */
export type PageData = z.infer<typeof pageSchema>;

/**
 * Complete page structure
 */
export type PagePost = {
	id: string;
	slug: string;
	body: string;
	collection: "page";
	data: PageData;
};

// Page schema
export const pageSchema = z.object({
	title: z.string(),
	seo: z
		.object({
			page_description: z.string().optional(),
			canonical_url: z.string().optional(),
			featured_image: z.string().optional(),
			featured_image_alt: z.string().optional(),
			author_twitter_handle: z.string().optional(),
			open_graph_type: z.string().optional(),
			no_index: z.boolean().optional(),
		})
		.optional(),
	content_blocks: z.array(z.any()).optional(),
});

// ============================================================================
// Union Types
// ============================================================================

/**
 * All content post types
 */
export type ContentPost =
	| BlogPost
	| BlogPost // NotePost (same as BlogPost)
	| DraftPost
	| EphemeraPost
	| PagePost;

/**
 * All content data types
 */
export type ContentData =
	| BlogData
	| BlogData // NoteData (same as BlogData)
	| DraftData
	| EphemeraData
	| PageData;
