# Lightfast Chat - Source Code Architecture

## Overview

The `apps/www/src` directory contains the source code for the Lightfast Chat application, a real-time AI chat application built with Next.js 15, Convex, and TypeScript. The application uses the App Router pattern and implements server-side rendering (SSR) with Partial Prerendering (PPR) for optimal performance.

### Key Features
- **Multi-Model AI Support**: Claude Sonnet 4 (default), GPT-4o-mini, GPT-4o, and OpenRouter models
- **Real-time Streaming**: Live AI response streaming with optimistic UI updates
- **GitHub Authentication**: Secure OAuth-based authentication with Convex Auth
- **Thread Management**: Persistent conversation history with sidebar navigation
- **Web Search**: Optional Exa-powered web search integration
- **File Attachments**: Support for image uploads and previews
- **Token Usage Tracking**: Monitor API usage and costs per message

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
├── components/            # React components organized by feature
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
├── env.ts                 # Environment variable validation
└── middleware.ts          # Next.js middleware for authentication
```

## Architecture Overview

### 1. Folder Organization

#### `/app` - Next.js App Router
The application uses Next.js 15's App Router with the following structure:

- **Root Layout** (`layout.tsx`):
  - Provides `ConvexAuthNextjsServerProvider` for authentication
  - Wraps app with `ConvexClientProvider` for real-time data
  - Imports global styles from `@repo/ui/globals.css`
  - Sets up dark theme and Geist font family

- **Home Page** (`page.tsx`):
  - Server component with SSR optimization
  - Checks authentication and redirects to `/chat` if signed in
  - Renders landing page with centered chat input

- **Chat Routes** (`/chat/*`):
  - `/chat/page.tsx`: New chat interface
  - `/chat/[threadId]/page.tsx`: Existing thread view with preloaded data
  - `/chat/layout.tsx`: Wraps chat pages with sidebar layout
  - `/chat/settings/page.tsx`: User settings (nested under chat for auth)

- **Share Routes** (`/share/[shareId]`):
  - Public read-only chat sharing
  - No authentication required
  - Uses `SharedChatView` component

- **Sign In** (`/signin`):
  - GitHub OAuth authentication flow
  - Handles redirect after successful login

- **Auth Loading** (`/auth/loading`):
  - Intermediate loading state during OAuth callback
  - Handles redirect with client-side navigation

- **Error Handling**:
  - `error.tsx`: Route-specific error boundaries
  - `global-error.tsx`: Global error boundary for unhandled errors
  - `not-found.tsx`: Custom 404 page

#### `/components` - Feature-Based Components
Components are organized by feature domain:

- **`/auth`**: Authentication components
  - `sign-in-dialog.tsx`: Modal for signing in
  - `sign-in-buttons.tsx`: GitHub OAuth button
  - `user-dropdown.tsx`: User menu with settings/logout
  - `preloaded-user-dropdown.tsx`: SSR-optimized user menu
  - `auth-redirect-handler.tsx`: Handles OAuth callback redirects

- **`/chat`**: Chat interface components
  - `chat-interface.tsx`: Main chat UI with streaming support
  - `chat-layout.tsx`: Sidebar + chat area layout
  - `chat-input.tsx`: Message input with file upload
  - `chat-messages.tsx`: Message list with virtualization
  - `message-display.tsx`: Individual message rendering
  - `message-actions.tsx`: Copy, regenerate, feedback actions
  - `model-branch-dropdown.tsx`: AI model selector
  - `token-usage-header.tsx`: Usage stats display
  - `share-dialog.tsx`: Share conversation UI
  - **`/shared`**: Reusable message components
    - `message-item.tsx`: Core message display logic
    - `message-avatar.tsx`: User/AI avatar rendering
    - `assistant-message-header.tsx`: AI message metadata
    - `thinking-content.tsx`: AI thinking state animation
  - **`/sidebar`**: Navigation components
    - `server-sidebar.tsx`: SSR sidebar wrapper
    - `preloaded-threads-list.tsx`: Optimized thread list
    - `thread-item.tsx`: Individual thread display
    - `active-menu-item.tsx`: Current thread indicator

- **`/landing`**: Landing page components
  - `landing-chat-input.tsx`: Hero section chat input

- **`/settings`**: User settings components
  - `settings-content.tsx`: Tab-based settings UI
  - `profile-section.tsx`: User profile management
  - `api-keys-section.tsx`: API key configuration
  - `settings-row.tsx`: Reusable settings form row

- **`/error`**: Error handling components
  - `error-boundary-ui.tsx`: User-friendly error display

#### `/hooks` - Custom React Hooks
- `use-auth.ts`: Authentication state and operations
- `use-chat.ts`: Core chat functionality with optimistic updates
- `use-file-drop.ts`: File upload handling
- `use-resumable-stream.ts`: Streaming message management
- `use-time-greeting.ts`: Time-based greeting logic

#### `/lib` - Utilities and Configuration
- **`/ai`**: AI model configuration and provider management
- `auth.ts`: Server-side authentication utilities
- `convex-provider.tsx`: Convex client provider wrapper
- `site-config.ts`: Site-wide configuration
- `nanoid.ts`: ID generation utilities

### 2. Key Components and Their Purposes

#### Chat Interface (`/components/chat/chat-interface.tsx`)
The main chat component that:
- Manages chat state using the `useChat` hook
- Handles message streaming with `useResumableChat`
- Supports both new chats and existing threads
- Implements optimistic UI updates

#### Chat Layout (`/components/chat/chat-layout.tsx`)
Provides the overall chat structure:
- Sidebar with thread list
- Header with title and actions
- Main chat content area
- Uses server components for optimal performance

#### Message Components (`/components/chat/shared/`)
Reusable message display components:
- `message-item.tsx`: Individual message rendering
- `message-avatar.tsx`: User/AI avatars
- `assistant-message-header.tsx`: AI message metadata
- `thinking-content.tsx`: AI thinking state display

### 3. Routing Structure (Next.js App Router)

```
/                          # Landing page (SSR)
/signin                    # Authentication page
/chat                      # New chat page
/chat/[threadId]          # Existing chat thread
/chat/settings            # User settings
/share/[shareId]          # Public shared chat view
```

#### Route Features:
- **Middleware Protection**: `/chat/*` routes require authentication
- **Client-Side Navigation**: Optimistic URL updates for smooth UX
- **Dynamic Routes**: Support for both Convex IDs and client-generated IDs
- **Error Boundaries**: Route-specific error handling

### 4. Authentication Implementation

#### Authentication Flow:
1. **Convex Auth**: Uses `@convex-dev/auth` for authentication
2. **GitHub OAuth**: Primary authentication provider
3. **JWT Tokens**: Server-side token management
4. **Middleware**: Route protection in `middleware.ts`

#### Key Components:
- **Server Provider**: `ConvexAuthNextjsServerProvider` in root layout
- **Client Hooks**: `useAuth()` for client-side auth state
- **Server Utilities**: `getCurrentUser()`, `isAuthenticated()` in `lib/auth.ts`
- **Sign In Flow**: Handled by `/signin` page with redirect support

### 5. Chat Functionality Architecture

#### Message Flow:
1. **User Input**: `ChatInput` component captures user messages
2. **Optimistic Updates**: `useChat` hook updates UI immediately
3. **Server Processing**: Convex mutations handle message creation
4. **AI Generation**: Streaming responses from AI providers
5. **Real-time Updates**: Convex subscriptions update all clients

#### Key Features:
- **Streaming Support**: Real-time AI response streaming
- **Optimistic UI**: Instant feedback for user actions
- **Thread Management**: Create, list, and navigate chat threads
- **Model Selection**: Support for multiple AI models
- **File Attachments**: Upload and preview support
- **Web Search**: Optional web search enhancement

#### State Management:
- **Convex Queries**: Real-time data subscriptions
- **Optimistic Updates**: Local state updates before server confirmation
- **URL State**: Thread IDs managed in URL for sharing
- **Preloaded Data**: SSR with preloaded queries for fast initial render

### 6. Settings and User Management

#### Settings Structure:
- **Profile Section**: User information and preferences
- **API Keys Section**: Manage personal API keys
- **Client-Side Tabs**: URL-preserving tab navigation

#### Implementation:
- Server-side data preloading
- Client-side form handling
- Secure API key storage (encrypted in Convex)

### 7. Patterns and Conventions

#### Code Standards:
- **TypeScript**: Strict mode with comprehensive types
- **Biome**: Code formatting and linting
- **Component Structure**: Functional components with hooks
- **File Naming**: Kebab-case for files, PascalCase for components

#### Performance Patterns:
- **Server Components**: Default for static content
- **Client Components**: Only when interactivity needed
- **Suspense Boundaries**: Loading states for async content
- **Preloading**: Server-side data fetching for SSR
- **Optimistic Updates**: Immediate UI feedback

#### Security Patterns:
- **Environment Validation**: Type-safe env vars with `@t3-oss/env-nextjs`
- **Authentication Middleware**: Route protection
- **API Key Encryption**: Secure storage in Convex
- **CORS Headers**: Proper origin validation

#### UI/UX Patterns:
- **Shadcn/UI Components**: Consistent design system
- **Dark Mode**: Default dark theme
- **Responsive Design**: Mobile-first approach
- **Accessibility**: ARIA labels and keyboard navigation
- **Error Boundaries**: Graceful error handling

## Key Technologies

- **Next.js 15**: App Router with PPR support
- **Convex**: Real-time database and backend
- **TypeScript**: Type-safe development
- **Tailwind CSS v4**: Utility-first styling
- **Shadcn/UI**: Component library
- **Biome**: Code quality tooling
- **Zod**: Schema validation

## Development Workflow

1. **Environment Setup**: Configure `.env.local` with required keys
2. **Type Safety**: Run `pnpm run typecheck` for type validation
3. **Code Quality**: Use `pnpm run lint` and `pnpm run format`
4. **Testing**: Vercel preview deployments for testing
5. **Error Handling**: Comprehensive error boundaries

## Best Practices

1. **Prefer Server Components**: Use client components only when necessary
2. **Optimize Imports**: Use barrel exports from shared components
3. **Type Everything**: Leverage TypeScript for safety
4. **Handle Loading States**: Use Suspense for async operations
5. **Secure Sensitive Data**: Never expose API keys client-side
6. **Follow Conventions**: Maintain consistent code style

## Monorepo Integration

### Shared UI Components
All UI components are imported from the `@repo/ui` package:

```typescript
// ✅ Correct - Import from shared package
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { cn } from "@repo/ui/lib/utils"

// ❌ Wrong - Don't create local UI components
import { Button } from "@/components/ui/button"
```

### Global Styles
The application imports global styles from the UI package:
```typescript
// In app/layout.tsx
import "@repo/ui/globals.css"
```

### Site Configuration
Shared configuration is imported from the UI package:
```typescript
import { siteConfig } from "@repo/ui/lib/site-config"
```

## Performance Optimizations

### 1. Server-Side Rendering (SSR)
- All pages are server components by default
- Authentication state is checked server-side
- Initial data is preloaded using Convex's `preloadQuery`

### 2. Partial Prerendering (PPR)
- Enabled in `next.config.ts` with `experimental.ppr = true`
- Static parts of pages are pre-rendered
- Dynamic content streams in as needed

### 3. Optimistic Updates
- Chat messages appear instantly in the UI
- Updates are reconciled when server responds
- Implemented in the `useChat` hook

### 4. Code Splitting
- Route-based code splitting with Next.js App Router
- Dynamic imports for heavy components
- Lazy loading of non-critical features

This architecture provides a solid foundation for a scalable, performant, and maintainable chat application with real-time capabilities and excellent user experience.
