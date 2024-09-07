type PostSlug = string;

interface PostData {
	title?: string;
}

interface Post {
	slug: PostSlug;
	body: string;
	data: PostData;
}

interface Backlink {
	slug: PostSlug;
	title: string;
}

type BacklinkMap = Record<PostSlug, Backlink[]>;

const extractLinksFromContent = (content: string): PostSlug[] => {
	const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
	return Array.from(content.matchAll(linkRegex)).map(
		([, , link]) => link || "",
	);
};

const addBacklink = (
	backlinks: BacklinkMap,
	linkedSlug: PostSlug,
	currentSlug: PostSlug,
	title: string,
): BacklinkMap => ({
	...backlinks,
	[linkedSlug]: [
		...(backlinks[linkedSlug] || []),
		{ slug: currentSlug, title },
	],
});

export function collectBacklinks(posts: Post[] = []): BacklinkMap {
	return posts.reduce(
		(
			backlinks: BacklinkMap,
			{ slug: currentSlug, body, data: { title } }: Post,
		) =>
			extractLinksFromContent(body).reduce(
				(acc, linkedSlug) =>
					addBacklink(acc, linkedSlug, currentSlug, title || currentSlug),
				backlinks,
			),
		{},
	);
}
