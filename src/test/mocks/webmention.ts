import { http, HttpResponse } from "msw";
import type { WebmentionEntry } from "../../utils/webmentions";

const mention = (id: string, url: string): WebmentionEntry => ({
	type: "entry",
	author: {
		type: "card",
		name: `Referencing Site ${id}`,
		url: `https://ref.example/${url.split("/").pop()}`,
	},
	url,
	published: "2025-01-01T00:00:00Z",
	"wm-received": "2025-01-01T00:05:00Z",
	"wm-id": Number(id),
	"wm-source": `https://ref.example/${url.split("/").pop()}`,
	"wm-target": "https://ryanparsley.com/",
	"wm-protocol": "webmention",
	content: {
		html: `<p>mention ${id}</p>`,
		text: `mention ${id}`,
	},
	"in-reply-to": "https://ryanparsley.com/",
	"wm-property": "mention-of",
	"wm-private": false,
});

/**
 * The three URL variants `fetchAllVariants` probes all report to webmention.io
 * as separate `target` values. They deliberately overlap: the same mention is
 * served for more than one variant, so the dedupe step has real work to do and
 * a test can assert an exact count rather than an empty list.
 */
const childrenByTarget: Record<string, WebmentionEntry[]> = {
	"https://ryanparsley.com/": [
		mention("1", "https://ref.example/one"),
		mention("2", "https://ref.example/two"),
	],
	"https://ryanparsley.com": [
		mention("1", "https://ref.example/one"),
		mention("3", "https://ref.example/three"),
	],
	"https://ryanparsley.com.html": [mention("2", "https://ref.example/two")],
};

export const webmentionHandlers = [
	http.get("https://webmention.io/api/mentions.jf2", ({ request }) => {
		const target = new URL(request.url).searchParams.get("target") ?? "";

		return HttpResponse.json({
			type: "feed",
			name: "Webmentions",
			children: childrenByTarget[target] ?? [],
		});
	}),
];
