# Environment Setup - Chat Application

This guide explains how to set up environment variables for the Lightfast Chat application in the submodules/chat directory.

## 🔄 Quick Setup

### From the root of the monorepo:
```bash
# Sync chat app environment variables
pnpm env:sync:chat:auto
```

### From within submodules/chat:
```bash
cd submodules/chat

# 1. Copy environment template
cp .env.example .env.local

# 2. Fill in your environment variables in .env.local
# See "Required Variables" section below

# 3. Auto-sync with Vercel + Convex
pnpm env:sync:auto
```

## 🏗️ How It Works

The environment sync process follows this flow:

1. **Vercel Pull**: Automatically pulls environment variables from Vercel dashboard to `.vercel/.env.development.local`
2. **Convex Sync**: Syncs required variables from local environment file to Convex backend
3. **with-env Integration**: Apps use `with-env` command that loads from `.vercel/.env.development.local`

### File Hierarchy

```
submodules/chat/
├── .env.example                           # Template (committed)
├── .env.local                            # Local development (gitignored)
├── .vercel/.env.development.local        # Pulled from Vercel (gitignored)
├── apps/www/
│   └── package.json                      # with-env: dotenv -e ../../.vercel/.env.development.local
└── scripts/sync-env.ts                   # Auto-sync script
```

## 🔑 Required Environment Variables

### Core APIs
- `ANTHROPIC_API_KEY` - Claude API key (required)
- `OPENAI_API_KEY` - OpenAI API key (required)  
- `OPENROUTER_API_KEY` - OpenRouter API key (required)
- `EXA_API_KEY` - Exa search API key (required)

### Authentication
- `JWT_PRIVATE_KEY` - JWT private key for auth (required)
- `JWKS` - JWT public keys JSON (required)
- `CLERK_JWT_ISSUER_DOMAIN` - Clerk issuer domain (required)
- `AUTH_GITHUB_ID` - GitHub OAuth client ID (optional)
- `AUTH_GITHUB_SECRET` - GitHub OAuth client secret (optional)

### Convex
- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL (required)

### Optional Services
- `ENCRYPTION_KEY` - For data encryption
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog analytics
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking

## 🚀 Development Workflow

### Starting Development
```bash
cd submodules/chat

# Environment sync happens automatically via predev hook
pnpm dev:www        # Starts Next.js + Convex concurrently

# Or run components separately
pnpm dev:next       # Next.js only
pnpm convex:dev     # Convex only
```

### Vercel Integration

If you have the Vercel CLI set up and the project linked:

```bash
cd submodules/chat

# Link to Vercel project (one-time setup)
vercel link

# Pull latest environment variables
vercel env pull .vercel/.env.development.local

# Sync to Convex
pnpm env:sync
```

### Manual Environment Management

```bash
cd submodules/chat

# Check what's in Convex
pnpm env:check

# Force sync specific variables
pnpm env:sync

# Add new variable in Vercel dashboard, then pull
vercel env add NEW_VARIABLE_NAME
vercel env pull .vercel/.env.development.local
pnpm env:sync
```

## 🐛 Troubleshooting

### "Environment file not found"
```bash
# Check if files exist
ls -la .env.local
ls -la .vercel/.env.development.local

# Create from template if missing
cp .env.example .env.local
```

### "Cannot connect to Convex deployment"
```bash
# Make sure Convex is set up
pnpm convex:dev

# Check Convex URL in environment
cat .env.local | grep CONVEX_URL
```

### "Vercel project not linked"
```bash
# Link to Vercel project
vercel link

# Verify linking worked
cat .vercel/project.json
```

### "Build failing with env validation"
```bash
# Skip validation during development
SKIP_ENV_VALIDATION=true pnpm build:www

# Or fix missing variables in .env.local
```

## ⚡ Auto-Sync Features

The environment sync script automatically:

- ✅ Pulls latest variables from Vercel (if linked)
- ✅ Validates all required variables are present
- ✅ Syncs only necessary variables to Convex
- ✅ Handles multi-line values (like JWT keys) properly
- ✅ Runs before `pnpm dev` and `pnpm build` via hooks

## 📚 Additional Resources

- [Convex Environment Variables](https://docs.convex.dev/production/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

For more detailed development workflow information, see [CLAUDE.md](./CLAUDE.md).