import { defineCollection, z } from "astro:content";

const pageCollection = defineCollection({
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// Transform string to Date object
		heroImage: z.string().optional(),
	}),
});

const blogCollection = defineCollection({
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// Transform string to Date object
		pubDate: z
			.string()
			.or(z.date())
			.or(z.number())
			.transform((val: string | Date | number) => new Date(val)),
		updatedpubDate: z
			.string()
			.optional()
			.transform((str: string | undefined) =>
				str ? new Date(str) : undefined
			),
		heroImage: z.string().optional(),
	}),
});

const draftCollection = defineCollection({
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		// Transform string to Date object
		pubDate: z
			.string()
			.optional()
			.or(z.date())
			.or(z.number())
			.transform((val: string | Date | number | undefined) =>
				val ? new Date(val) : new Date()
			),
		updatedpubDate: z
			.string()
			.optional()
			.transform((str: string | undefined) =>
				str ? new Date(str) : undefined
			),
		heroImage: z.string().optional(),
	}),
});

const tangentCollection = defineCollection({
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// Transform string to Date object
		pubDate: z
			.string()
			.or(z.date())
			.transform((val: string | Date) => new Date(val)),
		updatedpubDate: z
			.string()
			.optional()
			.transform((str: string | undefined) =>
				str ? new Date(str) : undefined
			),
		heroImage: z.string().optional(),
	}),
});

export const collections = {
	blog: blogCollection,
	draft: draftCollection,
	tangent: tangentCollection,
	page: pageCollection,
};
