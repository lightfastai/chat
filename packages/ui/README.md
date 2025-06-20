# @repo/ui

Shared UI component library for the Lightfast Chat monorepo.

## Overview

This package contains all the shadcn/ui components and utilities used across the Lightfast Chat applications. It provides a centralized location for UI components, ensuring consistency and reusability.

## Usage

### Installing in an app

Add the dependency to your app's `package.json`:

```json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

### Importing components

```tsx
import { Button } from "@repo/ui/components/button"
import { Card } from "@repo/ui/components/card"
import { cn } from "@repo/ui/lib/utils"
```

### Importing global styles

In your app's root layout:

```tsx
import "@repo/ui/globals.css"
```

## Adding new components

From the root of the monorepo, you can add new shadcn components:

```bash
bun run ui:add button
```

This will install the component into the `packages/ui/src/components` directory.

## Development

### Scripts

- `bun run lint` - Run biome linter
- `bun run format` - Format code with biome
- `bun run typecheck` - Run TypeScript type checking

### Structure

```
packages/ui/
├── src/
│   ├── components/     # All UI components
│   ├── lib/           # Utilities (cn function, etc.)
│   ├── hooks/         # Shared React hooks
│   └── globals.css    # Global styles and Tailwind directives
├── package.json
├── tsconfig.json
└── README.md
```

## Components

The package includes all standard shadcn/ui components:

- Accordion
- Alert & Alert Dialog
- Avatar
- Badge
- Button
- Card
- Checkbox
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Popover
- Progress
- Radio Group
- Scroll Area
- Select
- Separator
- Sheet
- Skeleton
- Switch
- Tabs
- Textarea
- Toast & Toaster
- Toggle & Toggle Group
- Tooltip

And more...

## Styling

All components use:
- Tailwind CSS for styling
- CSS variables for theming
- New York style from shadcn/ui
- Responsive and accessible by default