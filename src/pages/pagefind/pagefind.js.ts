import type { APIContext } from "astro";

export async function get({}: APIContext) {
	return new Response("export const search = () => {return {results: []}}");
}
