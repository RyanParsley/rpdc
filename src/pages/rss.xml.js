import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts.ts";
import { isPublished } from "../content.config";

export async function GET(context) {
	const posts = (await getCollection("blog")).filter(isPublished);
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
				link: `/blog/${post.slug}`,
			})),
	});
}
