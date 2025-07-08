import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// App Router is enabled by default in Next.js 13+
	experimental: {
		ppr: true,
	},
	async rewrites() {
		// Only add docs rewrites if DOCS_URL is available
		const docsUrl = process.env.DOCS_URL;
		if (docsUrl) {
			return [
				{
					source: "/docs",
					destination: `${docsUrl}/docs`,
				},
				{
					source: "/docs/:path*",
					destination: `${docsUrl}/docs/:path*`,
				},
			];
		}
		return [];
	},

	transpilePackages: ["@lightfast/ui"],
};

// Sentry configuration
const sentryWebpackPluginOptions = {
	// For all available options, see:
	// https://github.com/getsentry/sentry-webpack-plugin#options

	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	authToken: process.env.SENTRY_AUTH_TOKEN,

	// Only upload sourcemaps in production and on Vercel
	disableSourceMapUpload:
		process.env.NODE_ENV !== "production" || !process.env.VERCEL,

	silent: true, // Suppresses source map uploading logs during build
	tunnelRoute: "/monitoring", // Tunnel to avoid ad-blockers
	hideSourceMaps: true, // Hides source maps from generated client bundles

	// Tree shake logger statements on the client for bundle size reduction
	disableLogger: true,

	// Enables automatic instrumentation of Vercel Cron Monitors
	automaticVercelMonitors: true,

	// Enables React component annotations
	reactComponentAnnotation: {
		enabled: true,
	},
};

// Only wrap with Sentry on Vercel to avoid issues in development
const exportConfig = process.env.VERCEL
	? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
	: nextConfig;

export default exportConfig;
