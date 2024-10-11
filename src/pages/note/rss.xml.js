import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../../consts.ts";

export async function GET(context) {
	const posts = await getCollection("note");
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		trailingSlash: false,
		stylesheet: "/rss/styles.xsl",
		items: posts
			.sort((a, b) => b.data.pubDate - a.data.pubDate)
			.map((post) => ({
				...post.data,
				link: `/note/${post.slug}`,
			})),
	});
}
