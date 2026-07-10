export interface WebmentionContent {
	html: string;
	text: string;
}

export interface WebmentionCard {
	type: "card";
	name: string;
	photo?: string;
	url: string;
}

export interface WebmentionEntry {
	type: "entry";
	author: WebmentionCard;
	url: string;
	published: string;
	"wm-received": string;
	"wm-id": number;
	"wm-source": string;
	"wm-target": string;
	"wm-protocol": string;
	content: WebmentionContent;
	"in-reply-to": string;
	"wm-property": string;
	"wm-private": boolean;
}

export const isProperty = (
	item: WebmentionEntry,
	property: string,
): boolean => {
	return item["wm-property"] === property;
};

export const getUrlVariants = (url: string): string[] =>
	[
		url,
		url.endsWith("/") ? url.slice(0, -1) : url + "/",
		url.endsWith(".html")
			? null
			: `${url.endsWith("/") ? url.slice(0, -1) : url}.html`,
	].filter((variant): variant is string => variant !== null);

interface FetchOptions {
	apiToken: string;
	maxRetries?: number;
	timeoutMs?: number;
}

export const fetchWebmentionsForUrl = async (
	target: string,
	options: FetchOptions,
): Promise<WebmentionEntry[]> => {
	const { apiToken, maxRetries = 3, timeoutMs = 3000 } = options;

	if (!apiToken) {
		return [];
	}

	const encodedTarget = encodeURIComponent(target);
	const apiUrl = `https://webmention.io/api/mentions.jf2?target=${encodedTarget}&token=${apiToken}`;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

			const response = await fetch(apiUrl, {
				signal: controller.signal,
				headers: { "User-Agent": "Astro-Build/1.0" },
			});
			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();
			return data.children || [];
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.warn(
				`Webmention fetch attempt ${attempt + 1} failed: ${message}`,
			);

			if (attempt < maxRetries - 1) {
				const delayMs = Math.pow(2, attempt) * 1000;
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}
	}

	return [];
};

export const deduplicateMentions = (
	mentions: WebmentionEntry[],
): WebmentionEntry[] =>
	mentions.filter(
		(mention, index, self) =>
			mention !== null &&
			mention !== undefined &&
			self.findIndex((m) => m?.url === mention.url) === index,
	);

export const fetchAllVariants = async (
	target: string,
	apiToken: string,
): Promise<WebmentionEntry[]> => {
	const results = await Promise.all(
		getUrlVariants(target).map((variant) =>
			fetchWebmentionsForUrl(variant, { apiToken }),
		),
	);
	return deduplicateMentions(results.flat());
};

export const parseTokenFromEnvFile = (content: string): string | null => {
	for (const line of content.split("\n")) {
		const match = line.match(/^export\s+WEBMENTION_IO_TOKEN=(.*)$/);
		if (match?.[1]) {
			return match[1].replace(/^["']|["']$/g, "");
		}
	}
	return null;
};

export const buildBlueskyShareUrl = (
	postTitle: string,
	postUrl: string,
): string => {
	const shareText = `${postTitle} ${postUrl}`;
	return `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`;
};

export const buildMastodonShareUrl = (
	postTitle: string,
	postUrl: string,
	instance = "mastodon.social",
): string => {
	return `https://${instance}/share?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(postUrl)}`;
};

export const computeCounts = (children: WebmentionEntry[]) =>
	children.reduce(
		({ likesAndRepostsCount, mentionsCount, repliesCount }, item) => ({
			likesAndRepostsCount:
				likesAndRepostsCount +
				(isProperty(item, "like-of") || isProperty(item, "repost-of") ? 1 : 0),
			mentionsCount: mentionsCount + (isProperty(item, "mention-of") ? 1 : 0),
			repliesCount: repliesCount + (isProperty(item, "in-reply-to") ? 1 : 0),
		}),
		{ likesAndRepostsCount: 0, mentionsCount: 0, repliesCount: 0 },
	);
