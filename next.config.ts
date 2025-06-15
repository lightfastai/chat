import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"
import "@/env"

const withMDX = createMDX()

const nextConfig: NextConfig = {
  // App Router is enabled by default in Next.js 13+
  experimental: {
    ppr: true,
    // dynamicIO: true, // Conflicts with Convex Auth's header access during prerendering
    reactCompiler: true,
  },
  // Turbopack configuration (now top-level in Next.js 15)
  turbopack: {
    // Add custom rules if needed
  },
}

export default withMDX(nextConfig)
