# @lightfast/ai

This package contains AI-related utilities and tools for the Lightfast chat application.

## Overview

The AI package provides:
- Tool definitions and schemas for AI SDK integration
- Type-safe tool instances for various AI models
- Tool registry management with versioned naming pattern
- Integration with third-party services (e.g., Exa for web search)

## Structure

```
packages/ai/
├── src/
│   ├── tools/                 # AI tools system
│   │   ├── handlers/         # Individual tool implementations
│   │   │   ├── web_search_1_0_0.ts
│   │   │   └── web_search_1_1_0.ts
│   │   ├── types.ts          # Shared types and interfaces
│   │   ├── registry.ts       # Tool registry and exports
│   │   └── index.ts          # Public exports
│   └── index.ts              # Main package exports
├── package.json
├── tsconfig.json
└── README.md
```

## Usage

### Importing Tools

```typescript
import { 
  LIGHTFAST_TOOLS,
  LightfastToolSet,
  LightfastToolName,
  validateToolName,
  isLightfastToolName
} from '@lightfast/ai/tools';
```

### Tool Naming Convention

Tools follow a semantic versioning pattern: `<tool-name>_<major>_<minor>_<patch>`

Examples:
- `web_search_1_0_0` - Web Search v1.0.0
- `web_search_1_1_0` - Web Search v1.1.0 (with highlights/summaries)
- Future: `calculator_1_0_0`, `weather_1_0_0`, etc.

### Available Tools

1. **web_search_1_0_0** - Basic web search using Exa AI
   - Neural search with autoprompt
   - Returns title, URL, snippet, and score

2. **web_search_1_1_0** - Enhanced web search with content options
   - Supports highlights, summaries, or full text
   - Domain filtering (include/exclude)
   - Token usage estimation

## Adding New Tools

1. Create a new file in `src/tools/handlers/` following the naming pattern:
   ```typescript
   // src/tools/handlers/calculator_1_0_0.ts
   import { z } from "zod/v4";
   import { defineTool } from "../types";

   export const calculatorV1 = defineTool({
     name: "calculator_1_0_0" as const,
     displayName: "Calculator v1",
     description: "Perform mathematical calculations",
     inputSchema: z.object({
       expression: z.string(),
     }),
     outputSchema: z.object({
       result: z.number(),
     }),
     execute: async (input) => {
       // Implementation
       return { result: 42 };
     },
   });
   ```

2. Import and add to the registry in `src/tools/registry.ts`:
   ```typescript
   import { calculatorV1 } from "./handlers/calculator_1_0_0";

   export const toolDefinitions = {
     // ... existing tools
     calculator_1_0_0: calculatorV1,
   } as const;

   export const LIGHTFAST_TOOLS = {
     // ... existing tools
     calculator_1_0_0: tool({
       description: calculatorV1.description,
       inputSchema: calculatorV1.inputSchema,
       execute: calculatorV1.execute,
     }),
   } as const;
   ```

## Development

```bash
# Type checking
pnpm run typecheck

# Linting
pnpm run lint

# Formatting
pnpm run format
```

## Dependencies

- `ai`: AI SDK for tool integration
- `exa-js`: Web search capabilities
- `zod`: Schema validation