# Apps Directory Guidelines

Quick reference for working with apps in the monorepo.

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
└── public/              # Static assets
```

### Key Patterns

1. **UI imports**: Use `@repo/ui/components/ui/*` not `@/components/ui/*`
2. **Env vars**: Import from `@/env` not `process.env`
3. **Auth**: Check with `getAuthToken()` in server components
4. **Styles**: Import `@repo/ui/globals.css` in root layout

### Commands
```bash
pnpm run dev:www      # Dev server
pnpm run build:www    # Build
pnpm run convex:dev   # Convex backend
pnpm run env:sync     # Sync env vars to Convex
```

## Docs App

Fumadocs-powered documentation at `/docs`.

### Adding Pages
1. Create MDX file in `src/content/docs/`
2. Update section's `meta.json` with page name
3. Use frontmatter for title/description

### Structure
```
src/content/docs/
├── index.mdx          # /docs
├── meta.json          # Navigation
└── section/          
    ├── index.mdx      # Section landing
    ├── page.mdx       # Section page
    └── meta.json      # Section nav
```

### Commands
```bash
pnpm run dev:docs     # Dev server
pnpm run build:docs   # Build
```

## Common Patterns

- **Config**: Apps extend root `tsconfig.json` and `biome.json`
- **Dependencies**: Install in app, not root. Use `workspace:*` for internal packages
- **Assets**: Use `public/` directory, reference with `/path/to/asset`
- **Shared UI**: Import from `@repo/ui`

## Adding Third-Party Integrations

Quick checklist for adding services like PostHog, Sentry, etc:

### 1. Install Dependencies
```bash
cd apps/www  # Install in the app, NOT root
pnpm add posthog-js posthog-node
```

### 2. Update Environment Files
Add to **THREE** places:

#### `apps/www/src/env.ts`
```typescript
// Client-side vars (NEXT_PUBLIC_*)
client: {
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
}

// Server-side vars
server: {
  SENTRY_DSN: z.string().url().optional(),
}

// Don't forget runtimeEnv!
runtimeEnv: {
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  SENTRY_DSN: process.env.SENTRY_DSN,
}
```

#### `turbo.json`
```json
"globalEnv": [
  "NEXT_PUBLIC_POSTHOG_KEY",
  "SENTRY_DSN"
]
```

#### `.env.example`
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc-xxx  # Optional
SENTRY_DSN=https://xxx           # Optional
```

### 3. Use Validated Env
```typescript
import { env } from "@/env"  // ✅ Always use this
// NOT process.env.NEXT_PUBLIC_POSTHOG_KEY ❌
```

### 4. Handle Optional Integrations
```typescript
// Only init if key exists
export const posthog = env.NEXT_PUBLIC_POSTHOG_KEY 
  ? posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {...})
  : null
```

### Quick Reference
- **Client vars**: Use `NEXT_PUBLIC_*` prefix
- **Server vars**: No prefix needed
- **Always**: Update env.ts, turbo.json, .env.example
- **Test**: Run `SKIP_ENV_VALIDATION=true pnpm run build`

## Best Practices

1. **Keep apps focused** - Each app should have a single purpose
2. **Share through packages** - Don't duplicate code between apps
3. **Use workspace protocols** - For internal package dependencies
4. **Configure at root** - Shared configs should be at monorepo root
5. **Document deployment** - Each app should document its deployment process
6. **Validate environment variables** - Always use env.ts for type safety
7. **Handle optional integrations** - Don't break the app if keys are missing
