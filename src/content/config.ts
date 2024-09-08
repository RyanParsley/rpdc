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
	heroImage: z.string().optional(),
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
};

// Define collections
const pageCollection = defineCollection({
	schema: z.object(baseSchema),
});

const blogCollection = defineCollection({
	schema: z.object({
		...postSchema,
	}),
});

const noteCollection = defineCollection({
	schema: z.object({
		...postSchema,
	}),
});

const draftCollection = defineCollection({
	schema: z.object({
		...postSchema,
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

export const collections = {
	blog: blogCollection,
	draft: draftCollection,
	page: pageCollection,
	note: noteCollection,
};
