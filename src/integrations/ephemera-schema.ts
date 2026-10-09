import { z } from "astro/zod";

/**
 * Shared ephemera frontmatter schema — the single source of truth for
 * ephemera post data. Used by:
 * - src/content.config.ts (validates the ephemera collection at load time)
 * - src/integrations/posse.ts (types the gray-matter parse of the same files)
 */

export const dateTransformer = (val: string | Date | number | undefined) =>
	val ? new Date(val) : new Date();

export const ephemeraSchema = z.object({
	title: z.string().optional(),
	date: z.string().or(z.date()).or(z.number()).transform(dateTransformer),
	syndication: z
		.array(z.object({ href: z.string(), title: z.string() }))
		.optional(),
	youtube: z.string().optional(),
	image: z
		.object({
			src: z.string(),
			alt: z.string(),
		})
		.optional(),
});

export type EphemeraData = z.infer<typeof ephemeraSchema>;
