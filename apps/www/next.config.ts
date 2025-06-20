import type { NextConfig } from "next"
import "@/env"

const nextConfig: NextConfig = {
  // App Router is enabled by default in Next.js 13+
  experimental: {
    ppr: true,
  },
}

export default nextConfig
