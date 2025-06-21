# Lightfast Chat Documentation

This is the documentation site for Lightfast Chat, built with [Fumadocs v15](https://fumadocs.vercel.app/) and Next.js 15.

## Overview

The documentation site is a separate Next.js application within the monorepo, configured to be served at `/docs` path of the main domain. It uses Fumadocs for the documentation framework with MDX support for rich content.

## Development

```bash
# From root directory (using Turborepo)
bun dev:docs          # Runs on http://localhost:3002/docs

# From this directory
bun run dev           # Runs on http://localhost:3002/docs
bun run build         # Build for production
bun run start         # Run production server
bun run lint          # Run Biome linter
bun run format        # Format code with Biome
```

## Architecture

### Routing
- Uses Next.js App Router with a catch-all route at `[[...slug]]`
- Base path configured as `/docs` in `next.config.ts`
- All documentation pages are statically generated at build time

### Key Files
- `src/app/[[...slug]]/page.tsx` - Dynamic route handler for all doc pages
- `src/lib/source.ts` - Fumadocs source loader configuration
- `source.config.ts` - Fumadocs content configuration
- `src/components/docs-layout-wrapper.tsx` - Documentation layout wrapper
- `src/lib/site-config.ts` - Site metadata and configuration

## Content Structure

Documentation content is located in the `src/content/docs` directory:

```
src/content/docs/
├── index.mdx                    # Welcome page (/docs)
├── meta.json                    # Root navigation configuration
├── overview/                    # Overview section
│   ├── index.mdx               # Section index
│   ├── introduction.mdx        # Introduction to Lightfast Chat
│   ├── features.mdx            # Feature overview
│   └── meta.json               # Section navigation order
├── getting-started/            # Getting started guides
│   ├── installation.mdx        # Installation guide
│   ├── quickstart.mdx          # Quick start tutorial
│   ├── configuration.mdx       # Configuration guide
│   └── meta.json
├── guides/                     # In-depth guides
│   ├── claude-code-workflow.mdx # Claude Code development workflow
│   ├── deployment.mdx          # Deployment guide
│   ├── self-hosting.mdx        # Self-hosting instructions
│   └── meta.json
├── development/                # Development documentation
│   ├── setup.mdx               # Development setup
│   ├── architecture.mdx        # Architecture details
│   ├── contributing.mdx        # Contributing guidelines
│   └── meta.json
├── architecture/               # Technical architecture
│   ├── overview.mdx            # Architecture overview
│   ├── tech-stack.mdx          # Technology stack
│   ├── convex.mdx              # Convex backend details
│   └── meta.json
├── features/                   # Feature documentation
│   ├── chat.mdx                # Chat features
│   ├── models.mdx              # AI model support
│   └── meta.json
├── reference/                  # API & configuration reference
│   ├── api.mdx                 # API documentation
│   ├── models.mdx              # Model specifications
│   ├── configuration-reference.mdx # Configuration options
│   └── meta.json
└── resources/                  # Additional resources
    ├── changelog.mdx           # Version changelog
    ├── troubleshooting.mdx     # Common issues
    ├── migration.mdx           # Migration guides
    └── meta.json
```

### Navigation Configuration

Each directory contains a `meta.json` file that defines:
- Section title
- Page ordering
- Navigation structure

Example `meta.json`:
```json
{
  "title": "Getting Started",
  "pages": ["installation", "quickstart", "configuration"]
}
```

## Configuration

### Fumadocs Configuration
- `source.config.ts` - Defines the docs directory and MDX processing
- `src/lib/source.ts` - Creates the MDX source loader with page utilities

### Next.js Configuration
- `next.config.ts` - Sets base path to `/docs` and configures MDX
- `tsconfig.json` - TypeScript configuration extending root config
- `postcss.config.mjs` - PostCSS configuration for Tailwind

### UI Configuration
- Uses `@repo/ui` for shared components
- Custom site header and layout wrapper
- Dark mode disabled by default (can be enabled in layout config)

## Deployment

The docs app is deployed as a separate Vercel project:
- Production URL configured in `DOCS_URL` environment variable
- Main app (www) rewrites `/docs/*` paths to the docs deployment
- Static generation ensures fast page loads
- Configuration in `vercel.json` sets up proper routing

## Adding Documentation

### Creating a New Page
1. Create an MDX file in the appropriate directory
2. Add frontmatter with title and description:
   ```mdx
   ---
   title: Page Title
   description: Brief description for SEO
   ---
   ```
3. Update the directory's `meta.json` to include the new page

### Creating a New Section
1. Create a new directory under `src/content/docs/`
2. Add an `index.mdx` for the section landing page
3. Create a `meta.json` with title and pages array
4. Update parent `meta.json` to include the new section

### Using Components in MDX
You can import and use React components in MDX files:
```mdx
import { Callout } from 'fumadocs-ui/components/callout'

<Callout type="info">
  This is an info callout
</Callout>
```

## Tech Stack

- **Next.js 15** - React framework with App Router
- **Fumadocs v15** - Documentation framework
- **MDX** - Markdown with React components
- **Tailwind CSS v4** - Styling
- **Biome** - Linting and formatting
- **TypeScript** - Type safety

## Best Practices

1. **Use descriptive titles** - Each page should have a clear, SEO-friendly title
2. **Add descriptions** - Include meta descriptions for better SEO
3. **Organize logically** - Group related content in directories
4. **Update navigation** - Always update `meta.json` when adding pages
5. **Test locally** - Preview changes with `bun dev:docs` before deploying
6. **Use components** - Leverage Fumadocs UI components for rich content
7. **Keep it simple** - Write clear, concise documentation