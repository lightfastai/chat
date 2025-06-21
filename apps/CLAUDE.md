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

### Structure
```
apps/docs/
├── app/                 # Next.js App Router
│   ├── [[...slug]]/    # Dynamic route for all docs
│   └── layout.tsx      # Root layout with Fumadocs
├── content/            # MDX documentation files
│   └── docs/          # Documentation content
├── components/         # Docs-specific components
└── lib/               # Utilities
```

### Key Configuration

#### 1. Base Path
The docs app uses `basePath: "/docs"` in `next.config.mjs`:
```js
const nextConfig = {
  basePath: "/docs",
  assetPrefix: "/docs",
}
```

#### 2. Content Structure
Documentation is organized in `content/docs/`:
```
content/docs/
├── index.mdx           # /docs root page
├── getting-started.mdx # /docs/getting-started
├── architecture/       # /docs/architecture/*
├── features/          # /docs/features/*
└── development/       # /docs/development/*
```

#### 3. Fumadocs Configuration
- Source configuration in `source.config.ts`
- Layout configuration in `app/layout.config.tsx`
- Uses Fumadocs UI components for navigation

### Development Commands
```bash
# From root
bun dev:docs        # Run dev server on port 3002
bun run build:docs  # Build for production

# From apps/docs
bun run dev         # Run dev server
bun run build       # Build for production
```

### Adding Documentation
1. Create MDX files in `content/docs/`
2. Add frontmatter with title and description
3. Update `meta.json` files for navigation order
4. Use standard markdown with MDX components

### Deployment
- Deployed as separate Vercel project
- Accessible at `/docs` path on main domain
- www app rewrites `/docs/*` to docs deployment

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
