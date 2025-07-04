# AI Tools System

This directory contains the extensible tool system for AI agents. Each tool is self-contained with its own schemas, validators, and implementation.

## Architecture

```
src/lib/ai/tools/
├── schemas.ts       # Central registry importing from tools
├── helpers.ts       # Shared utilities
├── web-search.ts    # Web search tool implementation
└── README.md        # This file
```

## Tool Structure

Each tool file exports:
- Tool name constant
- Zod schemas (for AI SDK runtime validation)
- Convex validators (for database storage)
- Type definitions
- Metadata (name, description)
- Tool factory function

## Adding a New Tool

1. **Update schemas.ts**:
   ```typescript
   // Add to TOOL_NAMES
   export const TOOL_NAMES = ["web_search", "your_new_tool"] as const;
   
   // Add to TOOL_ZOD_SCHEMAS
   your_new_tool: {
     input: z.object({ /* input schema */ }),
     output: z.object({ /* output schema */ }),
   }
   
   // Add to TOOL_CONVEX_VALIDATORS (mirror the Zod schema)
   your_new_tool: {
     input: v.object({ /* input validator */ }),
     output: v.object({ /* output validator */ }),
   }
   
   // Add to TOOL_REGISTRY
   your_new_tool: {
     name: "your_new_tool" as const,
     description: "Tool description",
     zodSchema: TOOL_ZOD_SCHEMAS.your_new_tool,
     convexValidator: TOOL_CONVEX_VALIDATORS.your_new_tool,
   }
   ```

2. **Create tool implementation**:
   ```typescript
   import { tool } from "ai";
   import { TOOL_REGISTRY } from "../tools/schemas.js";
   
   export function createYourNewTool() {
     const toolDef = TOOL_REGISTRY.your_new_tool;
     
     return tool({
       description: toolDef.description,
       inputSchema: toolDef.zodSchema.input,
       execute: async (input) => {
         // Implementation
         return { /* output matching schema */ };
       },
     });
   }
   ```

3. **Update UI types** in `convertDbMessagesToUIMessages.ts`:
   ```typescript
   type LightfastUITools = {
     web_search: { /* ... */ };
     your_new_tool: {
       input: ToolInputSchema<"your_new_tool">;
       output: ToolOutputSchema<"your_new_tool">;
     };
   };
   ```

4. **Export from ai_tools.ts**:
   ```typescript
   export { createYourNewTool } from "../messages/your-new-tool.js";
   ```

## Type Safety

The system provides complete type safety:

```typescript
// Tool-specific types
type WebSearchInput = ToolInputSchema<"web_search">;
type WebSearchOutput = ToolOutputSchema<"web_search">;

// Type guards
if (isWebSearchToolCall(part)) {
  // part.input is typed as WebSearchInput
}

// Creating typed parts
const toolCall = createToolCallPart(
  "web_search",
  "call-123",
  { query: "AI news" }, // Type-checked
  Date.now()
);
```

## Best Practices

1. **Keep schemas in sync**: Ensure Zod and Convex validators match
2. **Use descriptive names**: Tool names should be clear and consistent
3. **Validate at boundaries**: Use validation helpers when processing tool data
4. **Document thoroughly**: Include descriptions in schemas for better AI understanding