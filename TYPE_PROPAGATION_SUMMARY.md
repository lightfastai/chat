# Type Propagation When Adding Web Search Tool v2.0.0

## What I Did

Added a new version "2.0.0" to the web search tool with enhanced features:
- New input fields: `searchType`, `domain`, `startDate`, `endDate`
- Increased `numResults` limit from 10 to 20
- Enhanced output with metadata including search time and version
- Changed default version from "1.0.0" to "2.0.0"

## How Types Propagated Automatically

### 1. **TOOL_VERSIONS Export** (tools.ts → validators.ts)
```typescript
// Automatically updated:
TOOL_VERSIONS.web_search = ["1.0.0", "2.0.0"]  // Was ["1.0.0"]
```

### 2. **Convex Validators** (validators.ts)
```typescript
// Automatically expanded to:
export const webSearchVersionValidator = v.union(
  v.literal("1.0.0"),
  v.literal("2.0.0")
);
```

### 3. **Type Inference**
```typescript
// Type automatically updated:
type ToolVersions<"web_search"> = "1.0.0" | "2.0.0"  // Was just "1.0.0"
```

### 4. **Default Version Impact**
- `LIGHTFAST_TOOLS.web_search` now uses v2.0.0's input/output schemas
- `getToolDefaultVersion("web_search")` returns "2.0.0"
- All new tool calls via streaming use v2.0.0 by default

## Type Safety Guarantees

1. **Compile-time**: TypeScript caught missing Exa API properties (`highlights`)
2. **Runtime**: Convex validators ensure only valid versions are stored
3. **Exhaustive checks**: Switch statements on versions are type-safe

## Architecture Benefits

1. **Single source of truth**: Define versions once in `tools.ts`
2. **Zero manual updates**: Types flow automatically to validators
3. **Backward compatible**: Existing v1.0.0 data remains valid
4. **Type-safe throughout**: From HTTP streaming to database storage

## Current Limitation

The streaming handler always uses the default version. To support version selection, would need to accept version in the request and validate it against available versions.