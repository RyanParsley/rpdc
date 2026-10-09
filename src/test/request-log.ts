/**
 * Captured copy of every request the MSW server sees, for assertions in
 * tests that exercise real fetch through the mock layer. Wired up in
 * setup.ts; cleared after each test.
 */

export interface CapturedRequest {
	readonly method: string;
	readonly url: string;
	readonly headers: Headers;
	/** Clone of the intercepted request — read the body via .text()/.json()/.formData() */
	readonly request: Request;
}

export const requestLog: CapturedRequest[] = [];

/** All captured requests whose URL contains the given fragment. */
export function requestsTo(urlFragment: string): CapturedRequest[] {
	return requestLog.filter((r) => r.url.includes(urlFragment));
}
