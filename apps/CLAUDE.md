# Apps Directory Guidelines

This document contains guidelines for working with applications in the monorepo.

## Overview

The apps directory contains all deployable applications:
- **www**: Main chat application
- **docs**: Documentation site

## WWW App (Main Chat Application)

### Structure
```
apps/www/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── auth/        # Authentication components
│   │   ├── chat/        # Chat interface components
│   │   ├── landing/     # Landing page components
│   │   ├── layout/      # Layout components
│   │   └── settings/    # Settings components
│   └── lib/             # Utilities and helpers
├── convex/              # Backend (see convex/CLAUDE.md)
├── public/              # Static assets
└── .env.local          # Environment variables
```

### Key Patterns

#### 1. UI Component Imports
**YOU MUST** import UI components from `@repo/ui`:
```tsx
// ✅ Correct
import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"

// ❌ Wrong
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

#### 2. Global Styles
Import global styles in the root layout:
```tsx
// app/layout.tsx
import "@repo/ui/globals.css"
```

#### 3. Environment Variables
- All env vars are validated in `src/env.ts`
- Use `SKIP_ENV_VALIDATION=true` for builds without all env vars
- Access env vars through the typed `env` object:
```tsx
import { env } from "@/env"
const apiKey = env.OPENAI_API_KEY
```

#### 4. Authentication
- Uses Convex Auth with GitHub OAuth
- Auth state managed by `@convex-dev/auth/nextjs`
- Always check auth in server components:
```tsx
const token = await getAuthToken()
if (!token) redirect("/signin")
```

### Development Commands
```bash
# From root
bun dev:www         # Run dev server
bun run build:www   # Build for production

# From apps/www
bun run dev         # Run dev server
bun run build       # Build for production
bun run convex:dev  # Run Convex dev server
bun run env:sync    # Sync environment variables
```

### Deployment
- Deployed to Vercel
- Uses `vercel-build` script for production deployment
- Preview deployments created for each PR
- Environment variables set in Vercel dashboard

## Docs App (Documentation Site)

### Overview
The docs app is a standalone Next.js 15 application using Fumadocs v15 for documentation. It's configured to be served at the `/docs` path of the main domain.

### Structure
```
apps/docs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [[...slug]]/       # Catch-all dynamic route
│   │   │   └── page.tsx       # Renders all doc pages
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout with providers
│   │   └── not-found.tsx      # 404 page
│   ├── components/            # Docs-specific components
│   │   ├── docs-layout-config.tsx    # Layout configuration
│   │   ├── docs-layout-wrapper.tsx   # Fumadocs layout wrapper
│   │   └── site-header.tsx          # Custom header
│   ├── content/               # MDX documentation files
│   │   └── docs/             # All documentation content
│   │       ├── index.mdx     # Welcome page
│   │       ├── meta.json     # Root navigation
│   │       └── ...sections/  # Documentation sections
│   └── lib/                  # Utilities
│       ├── site-config.ts    # Site configuration
│       ├── source.ts         # Fumadocs source loader
│       └── utils.ts          # Helper utilities
├── source.config.ts          # Fumadocs configuration
├── next.config.ts            # Next.js configuration
├── package.json              # Dependencies
└── vercel.json              # Deployment configuration
```

### Key Configuration

#### 1. Base Path & Routing
The docs app uses `basePath: "/docs"` in `next.config.ts`:
```typescript
const nextConfig = {
  basePath: "/docs",
  assetPrefix: "/docs",
}
```

All routes are handled by the `[[...slug]]` catch-all route, which:
- Fetches content based on the URL slug
- Generates static pages at build time
- Provides metadata for SEO

#### 2. Content Organization
Documentation is in `src/content/docs/` with hierarchical structure:
```
src/content/docs/
├── index.mdx                    # /docs
├── meta.json                    # Navigation order
├── overview/                    # /docs/overview/*
│   ├── index.mdx               # Section landing
│   ├── introduction.mdx        # Individual pages
│   ├── features.mdx
│   └── meta.json               # Section navigation
├── getting-started/            # /docs/getting-started/*
├── guides/                     # /docs/guides/*
├── development/                # /docs/development/*
├── architecture/               # /docs/architecture/*
├── features/                   # /docs/features/*
├── reference/                  # /docs/reference/*
└── resources/                  # /docs/resources/*
```

Each `meta.json` defines:
```json
{
  "title": "Section Title",
  "pages": ["page1", "page2", "page3"]
}
```

#### 3. Fumadocs Setup
- **source.config.ts**: Defines docs directory and MDX configuration
- **src/lib/source.ts**: Creates MDX source with page utilities
- **Layout**: Uses `DocsLayout` from Fumadocs UI with custom configuration
- **Search**: Built-in search functionality (can be enhanced)

### Development Commands
```bash
# From root (recommended)
bun dev:docs        # Run dev server on port 3002/docs
bun run build:docs  # Build for production

# From apps/docs
bun run dev         # Run dev server
bun run build       # Build (calls root build:docs)
bun run start       # Run production server
bun run lint        # Run Biome linter
bun run format      # Format code
```

### Adding Documentation

#### Creating a New Page
1. Create an MDX file in the appropriate directory:
```mdx
---
title: Your Page Title
description: Brief description for SEO
---

# Your Page Title

Your content here...
```

2. Update the section's `meta.json`:
```json
{
  "title": "Section Name",
  "pages": ["existing-page", "your-new-page"]
}
```

#### Creating a New Section
1. Create a directory under `src/content/docs/`
2. Add `index.mdx` for the section landing
3. Create `meta.json` with configuration
4. Update parent `meta.json` to include section

#### Using Components
Fumadocs provides built-in components:
```mdx
import { Callout } from 'fumadocs-ui/components/callout'
import { Card, Cards } from 'fumadocs-ui/components/card'
import { Steps, Step } from 'fumadocs-ui/components/steps'
import { Tabs, Tab } from 'fumadocs-ui/components/tabs'

<Callout type="info">
  Important information
</Callout>

<Cards>
  <Card title="Feature 1" href="/docs/feature1">
    Description
  </Card>
</Cards>
```

### Deployment
- Deployed as separate Vercel project
- Production URL set in `DOCS_URL` environment variable
- Main app (www) rewrites `/docs/*` to docs deployment:
  ```typescript
  // In www/next.config.ts
  async rewrites() {
    return [
      {
        source: "/docs/:path*",
        destination: `${env.DOCS_URL}/docs/:path*`,
      },
    ]
  }
  ```
- Static generation for optimal performance

### UI Integration
- Uses `@repo/ui` for shared components
- Icons imported from shared package
- Custom header maintains brand consistency
- Dark mode support (currently disabled)

### Best Practices
1. **MDX Files**: Use frontmatter for metadata
2. **Navigation**: Always update `meta.json` files
3. **URLs**: Use relative links within docs
4. **Images**: Place in `public/` directory
5. **Components**: Leverage Fumadocs UI components
6. **SEO**: Add descriptions to all pages
7. **Testing**: Preview with `bun dev:docs` before deploying

## Common Patterns Across Apps

### 1. TypeScript Configuration
All apps extend the root `tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 2. Biome Configuration
All apps extend the root `biome.json`:
```json
{
  "extends": ["../../biome.json"]
}
```

### 3. Package Dependencies
- Shared dependencies should go in `packages/ui`
- App-specific dependencies stay in the app's `package.json`
- Use workspace protocol for internal packages:
```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

### 4. Static Assets
- Place in `public/` directory of each app
- Reference with absolute paths: `/images/logo.png`
- Shared assets should be in the UI package

## Adding a New App

1. Create directory in `apps/`
2. Set up Next.js with TypeScript
3. Add `biome.json` extending root config
4. Add dependency on `@repo/ui` if using shared components
5. Configure build commands in root `package.json`
6. Update `turbo.json` if needed
7. Set up Vercel deployment

## Best Practices

1. **Keep apps focused** - Each app should have a single purpose
2. **Share through packages** - Don't duplicate code between apps
3. **Use workspace protocols** - For internal package dependencies
4. **Configure at root** - Shared configs should be at monorepo root
5. **Document deployment** - Each app should document its deployment process
