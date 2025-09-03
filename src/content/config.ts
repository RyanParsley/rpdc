import { defineCollection, z } from "astro:content";

// Reusable date transformer
const dateTransformer = (val: string | Date | number | undefined) =>
	val ? new Date(val) : new Date();

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

const postSchema = {
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
};

const blogCollection = defineCollection({
	schema: ({ image }) =>
		z.object({
			...postSchema,
			OGImage: image().optional(),
			heroImage: image().optional(),
		}),
});

const noteCollection = defineCollection({
	schema: ({ image }) =>
		z.object({
			...postSchema,
			OGImage: image().optional(),
			heroImage: image().optional(),
		}),
});

const draftCollection = defineCollection({
	schema: ({ image }) =>
		z.object({
			...postSchema,
			OGImage: image().optional(),
			heroImage: image().optional(),
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
		}),
});

const ephemeraCollection = defineCollection({
	schema: ({ image }) =>
		z.object({
			date: z.string().or(z.date()).or(z.number()).transform(dateTransformer),
			syndication: z
				.array(z.object({ href: z.string(), title: z.string() }))
				.optional(),
			youtube: z.string().optional(),
			image: z
				.object({
					src: image(),
					alt: z.string(),
				})
				.optional(),
		}),
});

const pageCollection = defineCollection({
	schema: () =>
		z.object({
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
		}),
});

export const collections = {
	blog: blogCollection,
	draft: draftCollection,
	note: noteCollection,
	ephemera: ephemeraCollection,
	page: pageCollection,
};
