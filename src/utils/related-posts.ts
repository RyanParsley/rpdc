/** The slice of a blog entry this module needs, so tests need no Astro runtime. */
export interface RelatedPostCandidate {
	id: string;
	data: {
		title: string;
		pubDate: Date;
		categories?: string[] | undefined;
		tags?: string[] | undefined;
		published?: boolean | undefined;
	};
}

export interface RelatedPost {
	id: string;
	title: string;
}

export interface RelatedPostSelection {
	current: string;
	categories?: string[] | undefined;
	tags?: string[] | undefined;
	limit?: number | undefined;
}

const DEFAULT_LIMIT = 3;

/** Mirrors `isPublished` in content.config without importing the Astro runtime. */
const isPublished = (post: RelatedPostCandidate): boolean =>
	post.data.published !== false;

const overlaps = (candidate: string[] | undefined, mine: string[]): boolean =>
	Boolean(candidate?.some((value) => mine.includes(value)));

const byRecency = (a: RelatedPostCandidate, b: RelatedPostCandidate): number =>
	b.data.pubDate.valueOf() - a.data.pubDate.valueOf();

/**
 * Pick posts related to the current one.
 *
 * Categories are the strong signal. Tags are the fallback, used only when nothing matched by
 * category, so a post with no categories still gets a block instead of nothing at all. Within a
 * tier the newest wins, and the result is capped.
 */
export function selectRelatedPosts(
	posts: RelatedPostCandidate[],
	{
		current,
		categories = [],
		tags = [],
		limit = DEFAULT_LIMIT,
	}: RelatedPostSelection,
): RelatedPost[] {
	const pool = posts.filter((post) => isPublished(post) && post.id !== current);

	const pick = (matched: RelatedPostCandidate[]): RelatedPost[] =>
		[...matched]
			.sort(byRecency)
			.slice(0, limit)
			.map(({ id, data: { title } }) => ({ id, title }));

	const byCategory = pool.filter((post) =>
		overlaps(post.data.categories, categories),
	);
	if (byCategory.length > 0) {
		return pick(byCategory);
	}

	return pick(pool.filter((post) => overlaps(post.data.tags, tags)));
}
