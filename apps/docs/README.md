# Lightfast Chat Documentation

This is the documentation site for Lightfast Chat, built with [Fumadocs](https://fumadocs.vercel.app/) and Next.js.

## Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Run production server
bun run start
```

## Content Structure

Documentation content is organized in the `content/docs` directory:

- `index.mdx` - Documentation home page
- `getting-started.mdx` - Getting started guide
- `architecture/` - Architecture documentation
  - `overview.mdx` - Architecture overview
  - `tech-stack.mdx` - Technology stack details
  - `convex.mdx` - Convex integration details
- `features/` - Features documentation
  - `chat.mdx` - Chat features
  - `models.mdx` - AI models
- `development/` - Development guides
  - `setup.mdx` - Development setup

## Configuration

- `source.config.ts` - Fumadocs source configuration
- `app/layout.config.tsx` - Layout configuration
- `tailwind.config.js` - Tailwind CSS configuration

## Deployment

The docs app is configured for deployment on Vercel with the configuration in `vercel.json`.