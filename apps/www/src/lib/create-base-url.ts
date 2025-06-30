/**
 * Creates the base stream URL for Convex HTTP streaming
 * This URL construction logic never changes, so it doesn't need to be memoized
 */
export function createStreamUrl(convexUrl: string): string {
	let convexSiteUrl: string;
	if (convexUrl.includes(".cloud")) {
		convexSiteUrl = convexUrl.replace(/\.cloud.*$/, ".site");
	} else {
		const url = new URL(convexUrl);
		url.port = String(Number(url.port) + 1);
		convexSiteUrl = url.toString().replace(/\/$/, "");
	}
	return `${convexSiteUrl}/stream-chat`;
}
