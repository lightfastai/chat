# AI Tools Guide

## Quick Start: Adding a New Tool

1. **Create handler file** in `handlers/` with versioned name:
   ```typescript
   // handlers/calculator_1_0_0.ts
   import { defineTool } from "../types";
   import { z } from "zod";

   export const calculatorV1 = defineTool({
     name: "calculator_1_0_0" as const,
     displayName: "Calculator v1",
     description: "Perform basic math calculations",
     inputSchema: z.object({
       expression: z.string().describe("Math expression to evaluate")
     }),
     outputSchema: z.object({
       result: z.number(),
       expression: z.string()
     }),
     execute: async (input) => {
       // Implementation here
       return { result: 42, expression: input.expression };
     }
   });
   ```

2. **Register in registry.ts**:
   ```typescript
   // Import your tool
   import { calculatorV1 } from "./handlers/calculator_1_0_0";

   // Add to toolDefinitions
   export const toolDefinitions = {
     // ... existing tools
     calculator_1_0_0: calculatorV1,
   } as const;

   // Add to LIGHTFAST_TOOLS
   export const LIGHTFAST_TOOLS = {
     // ... existing tools
     calculator_1_0_0: tool({
       description: calculatorV1.description,
       inputSchema: calculatorV1.inputSchema,
       execute: calculatorV1.execute,
     }),
   } as const;
   ```

3. **Enable in httpStreaming.ts**:
   ```typescript
   generationOptions.activeTools = ["web_search_1_1_0", "calculator_1_0_0"] as const;
   ```

## Tool Naming Convention

Format: `<tool_name>_<major>_<minor>_<patch>`
- Example: `web_search_1_0_0`, `calculator_2_1_3`
- Enforced by `ToolNamePattern` type

## Key Files

- **types.ts**: Core types and `defineTool()` helper
- **registry.ts**: Tool registration and AI SDK integration
- **handlers/**: Individual tool implementations
- **index.ts**: Public exports

## Type Safety

All tools have:
- Input validation via Zod schemas
- Output validation via Zod schemas
- Full TypeScript inference
- Runtime safety checks

## Usage in Chat

Tools are automatically:
1. Validated on input
2. Executed server-side
3. Streamed to client
4. Displayed in UI

## Best Practices

1. **Version new behaviors**: Create new version instead of modifying existing
2. **Keep tools focused**: One clear purpose per tool
3. **Document schemas**: Use `.describe()` for clarity
4. **Handle errors**: Return structured errors in output
5. **Test thoroughly**: Tools directly impact user experience