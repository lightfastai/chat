import type { NextConfig } from "next"
import { env } from "./src/env"

const nextConfig: NextConfig = {
  // App Router is enabled by default in Next.js 13+
  experimental: {
    ppr: true,
  },
  async rewrites() {
    return [
      {
        source: "/docs",
        destination: `${env.DOCS_URL}/docs`,
      },
      {
        source: "/docs/:path*",
        destination: `${env.DOCS_URL}/docs/:path*`,
      },
    ]
  },
}

export default nextConfig
