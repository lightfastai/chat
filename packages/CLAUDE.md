# Packages Directory Guidelines

This document contains guidelines for working with shared packages in the monorepo.

## Overview

The packages directory contains shared code used across multiple apps:
- **ui**: Shared UI component library (shadcn/ui components)

## UI Package (@repo/ui)

### Structure
```
packages/ui/
├── src/
│   ├── components/      # All UI components (28 total)
│   │   ├── alert.tsx         # Alert notifications
│   │   ├── avatar.tsx        # User/AI avatars
│   │   ├── badge.tsx         # Status badges
│   │   ├── button.tsx        # Button variants
│   │   ├── card.tsx          # Card containers
│   │   ├── checkbox.tsx      # Checkbox input
│   │   ├── code-block.tsx    # Code syntax highlighting
│   │   ├── dialog.tsx        # Modal dialogs
│   │   ├── dropdown-menu.tsx # Dropdown menus
│   │   ├── form.tsx          # Form components
│   │   ├── icons.tsx         # Icon components
│   │   ├── input.tsx         # Text inputs
│   │   ├── label.tsx         # Form labels
│   │   ├── markdown.tsx      # Markdown renderer
│   │   ├── progress.tsx      # Progress indicators
│   │   ├── scroll-area.tsx   # Scrollable areas
│   │   ├── select.tsx        # Select dropdowns
│   │   ├── separator.tsx     # Visual separators
│   │   ├── sheet.tsx         # Side sheets
│   │   ├── sidebar.tsx       # Sidebar navigation
│   │   ├── skeleton.tsx      # Loading skeletons
│   │   ├── switch.tsx        # Toggle switches
│   │   ├── tabs.tsx          # Tab navigation
│   │   ├── textarea.tsx      # Multiline text input
│   │   ├── toast.tsx         # Toast notifications
│   │   ├── toaster.tsx       # Toast container
│   │   ├── tooltip.tsx       # Tooltips
│   │   ├── site-footer.tsx   # Site footer component
│   │   ├── site-header.tsx   # Site header component
│   │   └── sonner.tsx        # Sonner toast library
│   ├── lib/            # Utilities
│   │   ├── utils.ts    # cn() utility and helpers
│   │   └── fonts.ts    # Font configuration
│   ├── hooks/          # Shared React hooks
│   │   └── use-mobile.ts # Mobile detection hook
│   ├── types/          # TypeScript type definitions
│   │   ├── nav.ts      # Navigation types
│   │   └── site.ts     # Site configuration types
│   └── globals.css     # Tailwind directives & global styles
├── package.json
├── tsconfig.json
└── README.md
```

### Package Exports
The UI package uses explicit exports in `package.json`:
```json
{
  "exports": {
    "./components/*": "./src/components/*.tsx",
    "./lib/*": "./src/lib/*.ts",
    "./lib/utils": "./src/lib/utils.ts",
    "./globals.css": "./src/globals.css"
  }
}
```

### Import Patterns

#### In Apps
```tsx
// Import components
import { Button } from "@repo/ui/components/ui/button"
import { Card, CardContent } from "@repo/ui/components/ui/card"

// Import utilities
import { cn } from "@repo/ui/lib/utils"

// Import types
import type { SiteConfig, NavItem } from "@repo/ui/types/site"

// Import global styles (in root layout only)
import "@repo/ui/globals.css"
```

#### Within UI Package
Components use relative imports:
```tsx
// In packages/ui/src/components/dialog.tsx
import { cn } from "../lib/utils"
import { Button } from "./button"
```

### Adding New Components

#### 1. Using shadcn/ui CLI
From the monorepo root:
```bash
pnpm run ui:add <component-name>
```

This will:
- Download the component from shadcn/ui
- Place it in `packages/ui/src/components/`
- Install any required dependencies
- Update imports to use relative paths

#### 2. Manual Addition
If adding a custom component:
```tsx
// packages/ui/src/components/my-component.tsx
import { cn } from "../lib/utils"

export interface MyComponentProps {
  className?: string
  children?: React.ReactNode
}

export function MyComponent({ className, children }: MyComponentProps) {
  return (
    <div className={cn("your-styles", className)}>
      {children}
    </div>
  )
}
```

### Component Guidelines

#### 1. Self-Contained Components
- Components should not depend on app-specific code
- Use props for all configuration
- Include TypeScript interfaces for props

#### 2. Styling Patterns
```tsx
// Always accept className prop
export function Component({ className, ...props }: ComponentProps) {
  return (
    <div className={cn("default-styles", className)} {...props} />
  )
}
```

#### 3. Relative Imports
- **NEVER** use `@/` imports in packages
- Always use relative imports: `../lib/utils`
- This ensures packages are portable

#### 4. Dependencies
- All UI dependencies go in `packages/ui/package.json`
- Apps should NOT install Radix UI packages directly
- Keep peer dependencies minimal (React, React DOM)

### Theming & Styling

#### CSS Variables
All components use CSS variables for theming:
```css
/* Define in globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  /* ... other variables */
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ... other variables */
}
```

#### Tailwind Configuration
The root `tailwind.config.ts` extends theme with CSS variables:
```ts
theme: {
  extend: {
    colors: {
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      // ... other colors
    }
  }
}
```

### Development Workflow

#### 1. Testing Changes
```bash
# Run the app that uses the component
pnpm run dev:www

# Changes to UI package are automatically reflected
```

#### 2. Type Checking
```bash
# From packages/ui
pnpm run typecheck

# From root (checks everything)
pnpm run typecheck
```

#### 3. Linting & Formatting
```bash
# From packages/ui
pnpm run lint
pnpm run format

# From root (runs on all packages)
pnpm run lint
pnpm run format
```

## Creating New Packages

### 1. Package Structure
```bash
mkdir -p packages/my-package/src
cd packages/my-package
```

### 2. Package.json
```json
{
  "name": "@repo/my-package",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./*": "./src/*.ts"
  },
  "scripts": {
    "lint": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.7",
    "typescript": "^5.8.3"
  }
}
```

### 3. TypeScript Configuration
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 4. Biome Configuration
```json
{
  "extends": ["../../biome.json"]
}
```

## Best Practices

### 1. Package Independence
- Packages should not depend on app-specific code
- Use dependency injection through props
- Keep packages focused and single-purpose

### 2. Version Management
- Keep all packages private (`"private": true`)
- Use `workspace:*` protocol in apps
- No need for version bumping

### 3. Documentation
- Every package needs a README.md
- Document all exports and usage patterns
- Include examples for complex components

### 4. Testing Strategy
- Unit tests belong in packages
- Integration tests belong in apps
- Use the apps to test package changes

### 5. Bundle Size
- Be mindful of dependencies
- Tree-shaking should work by default
- Avoid large dependencies for small utilities

## Common Issues & Solutions

### Import Resolution
**Problem**: "Module not found" errors
**Solution**: Check that exports are defined in package.json

### Type Errors
**Problem**: Types not recognized from packages
**Solution**: Ensure TypeScript paths are configured correctly

### Style Conflicts
**Problem**: Styles not applying correctly
**Solution**: Import globals.css only once in root layout

### Hot Reload
**Problem**: Changes not reflecting in dev
**Solution**: Restart dev server, clear `.next` cache
