import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const dateTransformer = (val: string | Date | number | undefined) =>
	val ? new Date(val) : new Date();

const dateFields = {
	pubDate: z.string().or(z.date()).or(z.number()).transform(dateTransformer),
	updatedDate: z
		.string()
		.optional()
		.or(z.date())
		.or(z.number())
		.transform(dateTransformer),
};

const syndicationField = z
	.array(z.object({ href: z.string(), title: z.string() }))
	.optional();

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
	published: z.boolean().optional(),
	syndication: syndicationField,
};

export const isPublished = (entry: {
	data: { published?: boolean | undefined };
}): boolean => entry.data.published !== false;

const blogCollection = defineCollection({
	loader: glob({
		pattern: "**/*.md",
		base: "./src/content/blog",
	}),
	schema: () =>
		z.object({
			...postSchema,
			OGImage: z.string().optional(),
			heroImage: z.string().optional(),
		}),
});

const noteCollection = defineCollection({
	loader: glob({
		pattern: "**/*.md",
		base: "./src/content/note",
	}),
	schema: () =>
		z.object({
			...postSchema,
			OGImage: z.string().optional(),
			heroImage: z.string().optional(),
		}),
});

const draftCollection = defineCollection({
	loader: glob({
		pattern: "**/*.md",
		base: "./src/content/draft",
	}),
	schema: () =>
		z.object({
			...postSchema,
			OGImage: z.string().optional(),
			heroImage: z.string().optional(),
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
	loader: glob({
		pattern: "**/*.md",
		base: "./src/content/ephemera",
	}),
	schema: () =>
		z.object({
			date: z.string().or(z.date()).or(z.number()).transform(dateTransformer),
			syndication: syndicationField,
			youtube: z.string().optional(),
			image: z
				.object({
					src: z.string(),
					alt: z.string(),
				})
				.optional(),
		}),
});

export const collections = {
	blog: blogCollection,
	draft: draftCollection,
	note: noteCollection,
	ephemera: ephemeraCollection,
};
