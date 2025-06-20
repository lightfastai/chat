import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next/types"

const withMDX = createMDX()

const config: NextConfig = {
  reactStrictMode: true,
  basePath: "/docs",
  assetPrefix: "/docs",
}

export default withMDX(config)
