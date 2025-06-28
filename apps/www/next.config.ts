import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // App Router is enabled by default in Next.js 13+
  experimental: {
    ppr: true,
  },
  async rewrites() {
    // Only add docs rewrites if DOCS_URL is available
    const docsUrl = process.env.DOCS_URL
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
      ]
    }
    return []
  },

  transpilePackages: ["@lightfast/ui"],
}

export default nextConfig
