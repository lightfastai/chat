# lightfast-chat

[![License: FSL-1.1-Apache-2.0](https://img.shields.io/badge/License-FSL--1.1--Apache--2.0-blue.svg)](LICENSE.md)
[![GitHub stars](https://img.shields.io/github/stars/lightfastai/chat)](https://github.com/lightfastai/chat/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/lightfastai/chat)](https://github.com/lightfastai/chat/issues)

An open-source, production-ready AI chat application featuring Claude Sonnet 4, GPT-4o, real-time messaging, and modern UI. Built with Next.js 15, Convex, and TypeScript.

🌐 **Live Demo**: [chat.lightfast.ai](https://chat.lightfast.ai)

## About

Lightfast Chat is a modern, open-source chat application that combines the best AI models with a seamless user experience. We host the application at [chat.lightfast.ai](https://chat.lightfast.ai), but you can also self-host it for your own needs.

### Why Lightfast Chat?

- ⚡ **Blazing Fast**: Built with Next.js 15, Convex for real-time updates
- 🤖 **Multiple AI Models**: Claude Sonnet 4, GPT-4o-mini, and more
- 🔒 **Privacy-First**: Self-hostable with your own API keys
- 💼 **Production Ready**: Used in production at [chat.lightfast.ai](https://chat.lightfast.ai)
- 🎨 **Modern UI**: Clean, responsive design with dark/light themes
- 📱 **Real-time**: Instant message delivery and streaming responses
- 🔐 **Secure**: GitHub OAuth authentication with Convex Auth

## Environment Variables

This project uses `@t3-oss/env-nextjs` for type-safe environment variable validation. The environment configuration is defined in `src/env.ts`.

### Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210  # For local development
CONVEX_DEPLOYMENT=your-convex-deployment-url   # For production

# AI API Keys (Required for AI responses)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here  # Required for Claude Sonnet 4 (default)
OPENAI_API_KEY=sk-your-openai-api-key-here            # Required for GPT models
OPENROUTER_API_KEY=sk-or-your-openrouter-key-here     # Required for additional AI models
EXA_API_KEY=your-exa-api-key-here                     # Required for web search functionality

# Authentication
AUTH_GITHUB_ID=your-github-oauth-client-id             # Required for GitHub OAuth
AUTH_GITHUB_SECRET=your-github-oauth-client-secret     # Required for GitHub OAuth
JWT_PRIVATE_KEY=your-jwt-private-key                  # Required for API key encryption
JWKS=your-jwks-json-string                            # Required for JWT verification (JSON format)
ENCRYPTION_KEY=your-encryption-key                    # Optional fallback encryption key

# Convex Configuration (optional)
CONVEX_SITE_URL=https://your-site-url.com             # Optional for auth configuration

# Vercel Environment (optional)
NEXT_PUBLIC_VERCEL_ENV=development                     # deployment environment

# Node Environment
NODE_ENV=development
```

### Environment Variable Categories

#### **🔒 Server-only Variables**
These are only available on the server-side and will throw an error if accessed on the client:
- `ANTHROPIC_API_KEY` - Claude Sonnet 4 API access (required)
- `OPENAI_API_KEY` - GPT models API access (required)
- `OPENROUTER_API_KEY` - Additional AI models via OpenRouter (required)
- `EXA_API_KEY` - Web search functionality (required)
- `AUTH_GITHUB_ID` - GitHub OAuth client ID (required)
- `AUTH_GITHUB_SECRET` - GitHub OAuth client secret (required)
- `JWT_PRIVATE_KEY` - JWT token signing for API key encryption (required)
- `JWKS` - JWT verification keys in JSON format (required)
- `ENCRYPTION_KEY` - Fallback encryption key if JWT_PRIVATE_KEY unavailable (optional)
- `CONVEX_SITE_URL` - Site URL for authentication configuration (optional)

#### **🌐 Client-accessible Variables**
These are available on both server and client (must be prefixed with `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_CONVEX_URL` - Convex backend URL
- `NEXT_PUBLIC_VERCEL_ENV` - Deployment environment detection

#### **⚙️ Shared Variables**
Available on both client and server:
- `NODE_ENV` - Runtime environment (development/production)

### 🔑 Getting API Keys

- **Anthropic API**: Sign up at [console.anthropic.com](https://console.anthropic.com) for Claude access
- **OpenAI API**: Get your key from [platform.openai.com](https://platform.openai.com/api-keys)
- **OpenRouter API**: Register at [openrouter.ai](https://openrouter.ai) for additional model access
- **Exa API**: Create account at [exa.ai](https://exa.ai) for web search capabilities
- **GitHub OAuth**: Configure at [GitHub Developer Settings](https://github.com/settings/developers)

### 🔐 Generating Cryptographic Keys

#### JWT Private Key & JWKS Pair
Generate a matching JWT private key and JWKS (public key) pair using this script:

```javascript
// save as generate-jwt-keys.js and run with: node generate-jwt-keys.js
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", {
  extractable: true,
});
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

process.stdout.write(
  `JWT_PRIVATE_KEY="${privateKey.trimEnd().replace(/\n/g, " ")}"`
);
process.stdout.write("\n");
process.stdout.write(`JWKS=${jwks}`);
process.stdout.write("\n");
```

Copy the output directly to your `.env.local` file.

#### Encryption Key
Generate a secure encryption key using Node.js:

```bash
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

This creates a cryptographically secure 256-bit key for fallback encryption.

## Authentication Setup

This app uses GitHub OAuth for authentication. To set up authentication:

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Your app name
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and **Client Secret**

### 2. Set Environment Variables

Add the GitHub OAuth credentials to your `.env.local` file:

```bash
AUTH_GITHUB_ID=your_github_client_id_here
AUTH_GITHUB_SECRET=your_github_client_secret_here
```

### 3. Sync Environment Variables

Run the sync script to push environment variables to Convex:

```bash
pnpm run env:sync  # Run from root with .env.local in root directory
```

### Usage

Instead of accessing `process.env` directly, import and use the validated `env` object:

```typescript
// ✅ Correct - Type-safe and validated
import { env } from "@/env"
const convexUrl = env.NEXT_PUBLIC_CONVEX_URL

// ❌ Incorrect - No type safety or validation
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
```

### Skipping Validation

For Docker builds or CI/CD where environment validation might interfere, you can skip validation:

```bash
SKIP_ENV_VALIDATION=true pnpm run build
```

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys and configuration
   ```

3. Set up GitHub OAuth (see Authentication Setup section above)

4. Sync environment variables to Convex:
   ```bash
   pnpm run env:sync  # Run from root with .env.local in root directory
   ```
   
   This command will:
   - Validate all required environment variables
   - Sync API keys and authentication settings to Convex
   - Use the `.env.local` file from the root directory
   - Automatically set NODE_ENV=development for local development

5. Start the development servers (Next.js + Convex concurrently):
   ```bash
   pnpm run dev:www
   ```
   
   This command will start both the Next.js development server and Convex dev server concurrently with color-coded output.
   
   **Alternative**: If you prefer separate terminals:
   ```bash
   # Terminal 1: Start Convex development server
   pnpm run convex:dev
   
   # Terminal 2: Start Next.js development server only
   cd apps/www && pnpm run dev:next
   ```

6. Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub

## ✨ Features

### 🤖 AI & Chat
- **Multiple AI Models**: Claude Sonnet 4 (default), GPT-4o-mini, and more
- **Streaming Responses**: Real-time AI response streaming
- **Thread Management**: Organized conversations with persistent history
- **Message Actions**: Copy, regenerate, and feedback on responses
- **Token Usage Tracking**: Monitor your API usage and costs

### 🎨 User Experience
- **Modern Landing Page**: v0.dev-inspired design with centered chat input
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Dark/Light Themes**: Automatic theme switching support
- **Real-time Updates**: Live message delivery with Convex
- **File Attachments**: Support for image and document uploads

### 🔧 Developer Experience
- **Type-safe**: Full TypeScript with validated environment variables
- **Modern Stack**: Next.js 15 with App Router and Partial Prerendering (PPR)
- **Real-time Backend**: Convex for database, auth, and real-time updates
- **Code Quality**: Biome for fast linting and formatting
- **Git Workflows**: Automated worktree management and deployment

### 🔐 Security & Auth
- **GitHub OAuth**: Secure authentication with Convex Auth
- **API Key Management**: Secure storage and validation of user API keys
- **Privacy Controls**: Self-hostable with your own infrastructure

## 🏗️ Architecture

### Frontend
- **Next.js 15**: Latest features with App Router and Partial Prerendering (PPR)
- **React 19**: Cutting-edge React features and performance
- **TypeScript**: Full type safety across the application
- **Tailwind CSS v4**: Modern utility-first styling
- **shadcn/ui**: High-quality, accessible UI components

### Backend
- **Convex**: Real-time database with built-in auth and functions
- **Server Actions**: Type-safe server-side operations
- **File Storage**: Built-in file upload and management
- **Real-time**: WebSocket-based real-time updates

### Infrastructure
- **Vercel**: Production deployment and preview environments
- **GitHub Actions**: Automated testing and deployment
- **Turborepo**: Optimized build system and caching

## Environment Validation Benefits

1. **Build-time validation**: Catches missing environment variables before deployment
2. **Type safety**: Full TypeScript intellisense for environment variables
3. **Runtime safety**: Prevents access to server variables on the client
4. **Transform support**: Use Zod transforms and default values
5. **Clear errors**: Descriptive error messages for debugging

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|------------|----------|
| **Frontend** | Next.js 15 | React framework with App Router + PPR |
| | React 19 | Latest React features and performance |
| | TypeScript | Type safety and developer experience |
| | Tailwind CSS v4 | Utility-first styling |
| | shadcn/ui | High-quality UI components |
| **Backend** | Convex | Real-time database and auth |
| | Convex Auth | GitHub OAuth integration |
| | Server Actions | Type-safe server operations |
| **AI/ML** | Anthropic Claude | Claude Sonnet 4 integration |
| | OpenAI | GPT-4o-mini integration |
| | Vercel AI SDK | Streaming and AI utilities |
| **DevOps** | Vercel | Deployment and hosting |
| | GitHub Actions | CI/CD automation |
| | Turborepo | Build optimization |
| **Code Quality** | Biome | Fast linting and formatting |
| | TypeScript | Static type checking |
| | Zod | Runtime validation |

## Available Scripts

### Monorepo Commands
- `pnpm run dev` - Run all apps in development mode
- `pnpm run dev:www` - Run chat app (Next.js + Convex concurrently)
- `pnpm run dev:docs` - Run only the documentation site
- `pnpm run build` - Build all applications
- `pnpm run build:www` - Build only the chat application
- `pnpm run build:docs` - Build only the documentation site

### Code Quality
- `pnpm run lint` - Run Biome linter and fix issues
- `pnpm run format` - Format code with Biome
- `pnpm run typecheck` - Run TypeScript type checking

### Development Servers
- `pnpm run dev:www` - Start Next.js + Convex concurrently
- `pnpm run dev:next` - Start Next.js development server only (run from apps/www)
- `pnpm run convex:dev` - Start Convex development server (run from root)
- `pnpm run convex:deploy` - Deploy to Convex (run from apps/www)
- `pnpm run env:sync` - Sync environment variables to Convex (run from root with .env.local in root)

### UI Components
- `pnpm run ui:add <component>` - Add a new shadcn/ui component
- `pnpm run ui:diff` - Check for component updates

## Project Structure

This is a Turborepo monorepo with the following structure:

```
├── apps/                    # Applications
│   ├── www/                # Main chat application
│   │   ├── src/           # Source code
│   │   │   ├── app/       # Next.js App Router pages
│   │   │   ├── components/# Feature-based components
│   │   │   ├── hooks/     # Custom React hooks
│   │   │   └── lib/       # Utilities and config
│   │   ├── convex/        # Backend functions & database
│   │   └── public/        # Static assets
│   └── docs/              # Documentation site (Fumadocs)
├── packages/              # Shared packages
│   └── ui/               # Shared UI component library
│       ├── src/
│       │   ├── components/ # shadcn/ui components (28 total)
│       │   ├── lib/       # Shared utilities
│       │   ├── hooks/     # Shared React hooks
│       │   └── types/     # TypeScript definitions
│       └── globals.css    # Shared Tailwind styles
├── scripts/              # Development & deployment scripts
├── turbo.json           # Turborepo configuration
├── components.json      # shadcn/ui configuration
└── package.json         # Root dependencies and scripts
```

### Key Directories
- **apps/www**: Main chat application with Next.js 15, Convex, and TypeScript
- **apps/docs**: Documentation site built with Fumadocs
- **packages/ui**: Shared UI components based on shadcn/ui
- **scripts**: Automation scripts for development workflow

## Development

The project uses Biome for code formatting and linting. Run these commands to maintain code quality:

```bash
# Format all files
pnpm run format

# Lint and fix issues
pnpm run lint
```

## 🚀 Deployment

### Option 1: Use Our Hosted Version
Simply visit [chat.lightfast.ai](https://chat.lightfast.ai) and start chatting with your GitHub account.

### Option 2: Self-Host

#### Quick Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lightfastai/chat)

#### Manual Deployment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/chat.git
   cd chat
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Convex**
   ```bash
   pnpm run convex:dev  # Follow the setup prompts
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   pnpm run env:sync
   ```

5. **Deploy Convex functions**
   ```bash
   pnpm run convex:deploy
   ```

6. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

### Environment Variables for Self-Hosting

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude Sonnet 4 API access |
| `OPENAI_API_KEY` | Yes | GPT models API access |
| `OPENROUTER_API_KEY` | Yes | Additional AI models via OpenRouter |
| `EXA_API_KEY` | Yes | Web search functionality |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth client ID |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth client secret |
| `JWT_PRIVATE_KEY` | Yes | JWT token signing key |
| `JWKS` | Yes | JWT verification keys |
| `ENCRYPTION_KEY` | Yes | Fallback encryption key if JWT_PRIVATE_KEY is not available
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL |
| `CONVEX_DEPLOYMENT` | Production | Convex deployment identifier |
| `NEXT_PUBLIC_VERCEL_ENV` | Optional | Deployment environment detection |

## 📚 Documentation

Comprehensive documentation is available at [chat.lightfast.ai/docs](https://chat.lightfast.ai/docs).

### Documentation Structure
- **[Overview](https://chat.lightfast.ai/docs/overview)** - Introduction and features
- **[Getting Started](https://chat.lightfast.ai/docs/getting-started)** - Installation and quick start
- **[Guides](https://chat.lightfast.ai/docs/guides)** - In-depth tutorials and workflows
- **[Architecture](https://chat.lightfast.ai/docs/architecture)** - Technical details
- **[API Reference](https://chat.lightfast.ai/docs/reference/api)** - Backend API documentation
- **[Development](https://chat.lightfast.ai/docs/development)** - Contributing and setup

### Local Documentation Development
```bash
# Run documentation locally
pnpm run dev:docs

# Access at http://localhost:3002/docs
```

The documentation is built with Fumadocs and MDX, allowing rich content with React components.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Submit a pull request

### Code Style
- We use Biome for formatting and linting
- Run `pnpm run lint` and `pnpm run format` before committing
- Follow our TypeScript and React best practices

## 📄 License

This project is licensed under the [Functional Source License v1.1 with Apache 2.0 Future License](LICENSE.md).

**TL;DR**: You can use this software for any purpose except creating a competing commercial product. After 2 years, it becomes Apache 2.0 licensed.

## 🌟 Community

- **Website**: [lightfast.ai](https://lightfast.ai)
- **Chat Demo**: [chat.lightfast.ai](https://chat.lightfast.ai)
- **GitHub**: [github.com/lightfastai/chat](https://github.com/lightfastai/chat)
- **Discord**: [Join our community](https://discord.gg/YqPDfcar2C)
- **Twitter**: [@lightfastai](https://x.com/lightfastai)

## 💖 Support

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- 🤝 Contributing code or documentation
---

**Built with ❤️ by the Lightfast team**
