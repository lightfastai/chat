import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// App Router is enabled by default in Next.js 13+
	experimental: {
		ppr: true,
	},
	async rewrites() {
		const rewrites = [];

		// Only add docs rewrites if DOCS_URL is available
		const docsUrl = process.env.DOCS_URL;
		if (docsUrl) {
			rewrites.push(
				{
					source: "/docs",
					destination: `${docsUrl}/docs`,
				},
				{
					source: "/docs/:path*",
					destination: `${docsUrl}/docs/:path*`,
				},
			);
		}

		// PostHog reverse proxy to avoid ad blockers
		rewrites.push(
			{
				source: "/ingest/static/:path*",
				destination: "https://us-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/decide",
				destination: "https://us.i.posthog.com/decide",
			},
			{
				source: "/ingest/:path*",
				destination: "https://us.i.posthog.com/:path*",
			},
		);

		return rewrites;
	},

	// Required for PostHog API calls
	skipTrailingSlashRedirect: true,

	transpilePackages: ["@lightfast/ui"],
};

export default nextConfig;
