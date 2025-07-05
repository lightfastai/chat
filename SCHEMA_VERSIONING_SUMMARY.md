# Schema Versioning with Different Input Schemas

## The Challenge

When tool versions have completely different input schemas (like v1.0.0 vs v2.0.0 of web search), the type system needs careful handling to maintain type safety.

## What We Changed

### 1. **Version-Specific Validators** (validators.ts)
Instead of a single input validator, we created version-specific validators:
```typescript
const webSearchV1InputValidator = v.object({
  query: v.string(),
  useAutoprompt: v.boolean(),
  numResults: v.number(),
});

const webSearchV2InputValidator = v.object({
  search: v.object({
    text: v.string(),
    mode: v.union(v.literal("smart"), v.literal("exact"), v.literal("fuzzy")),
  }),
  filters: v.optional(v.object({...})),
  options: v.optional(v.object({...})),
});
```

### 2. **Discriminated Unions by Version**
The mutation validators now discriminate by both tool name AND version:
```typescript
export const addToolCallArgsValidator = v.union(
  v.object({
    toolName: v.literal("web_search"),
    toolVersion: v.literal("1.0.0"),
    input: webSearchV1InputValidator,
  }),
  v.object({
    toolName: v.literal("web_search"),
    toolVersion: v.literal("2.0.0"),
    input: webSearchV2InputValidator,
  }),
);
```

### 3. **Type-Safe Tool Creation** (tools.ts)
We explicitly type the tool to help TypeScript understand the schema:
```typescript
const webSearchDefaultVersion = webSearchTool.versions[webSearchTool.defaultVersion];

type WebSearchInput = z.infer<typeof webSearchDefaultVersion.inputSchema>;
type WebSearchOutput = z.infer<typeof webSearchDefaultVersion.outputSchema>;

export const LIGHTFAST_TOOLS = {
  web_search: tool<WebSearchInput, WebSearchOutput>({
    description: webSearchTool.description,
    inputSchema: webSearchDefaultVersion.inputSchema,
    execute: webSearchDefaultVersion.execute,
  }),
};
```

### 4. **UI Compatibility** (web-search-tool.tsx)
The UI component handles both schemas gracefully:
```typescript
let searchQuery: string | undefined;
const input = toolCall.args.input;
if (input && typeof input === 'object') {
  if ('query' in input) {
    // v1.0.0 schema
    searchQuery = input.query as string;
  } else if ('search' in input && typeof input.search === 'object' && 'text' in input.search) {
    // v2.0.0 schema
    searchQuery = input.search.text as string;
  }
}
```

## Key Insights

1. **Version-specific validators are essential** when schemas differ significantly
2. **Discriminated unions** provide type safety at the database level
3. **Explicit typing** helps TypeScript infer complex generic types
4. **Runtime type guards** in UI components ensure backward compatibility

## Current Limitation

The streaming handler always uses the default version. To support version selection:
1. Accept version in the HTTP request
2. Validate against available versions
3. Use the specified version's schema and executor

This architecture successfully handles multiple tool versions with different schemas while maintaining full type safety.