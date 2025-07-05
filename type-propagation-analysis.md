# Type Propagation Analysis: Adding Web Search Tool v2.0.0

## Summary of Changes

When we added version "2.0.0" to the web search tool, the type system automatically propagated the changes throughout the codebase without requiring manual updates to type definitions.

## What Changed

### 1. Tool Definition (`tools.ts`)
```typescript
// Before: Only had version 1.0.0
versions: {
  "1.0.0": { ... }
}

// After: Added version 2.0.0 with enhanced features
versions: {
  "1.0.0": { ... },
  "2.0.0": {
    // New fields: searchType, domain, startDate, endDate
    // Increased numResults limit: 10 → 20
    // Enhanced output with metadata
  }
}
```

### 2. Automatic Type Updates

#### `TOOL_VERSIONS` Export
```typescript
// Automatically updated from:
TOOL_VERSIONS.web_search = ["1.0.0"]

// To:
TOOL_VERSIONS.web_search = ["1.0.0", "2.0.0"]
```

#### `ToolVersions<"web_search">` Type
```typescript
// Automatically updated from:
type WebSearchVersions = "1.0.0"

// To:
type WebSearchVersions = "1.0.0" | "2.0.0"
```

### 3. Convex Validator Updates (`validators.ts`)

The validators automatically picked up both versions:
```typescript
export const webSearchVersionValidator = v.union(
  ...TOOL_VERSIONS.web_search.map((ver) => v.literal(ver)),
);
// Expands to: v.union(v.literal("1.0.0"), v.literal("2.0.0"))
```

### 4. Default Version Impact

Since we changed `defaultVersion` to "2.0.0":
- `LIGHTFAST_TOOLS.web_search` now uses v2.0.0's schema
- All new tool calls will use v2.0.0 by default
- The streaming handler uses `getToolDefaultVersion()` which returns "2.0.0"

## Type Safety Guarantees

### 1. Compile-Time Safety
- Invalid version strings are caught at compile time
- Version-specific input/output types are enforced
- Exhaustive switch statements on versions

### 2. Runtime Validation
- Convex validators ensure only valid versions are stored
- Tool version validation in `isValidToolVersion()`
- Discriminated unions prevent invalid tool/version combinations

### 3. Backward Compatibility
- Existing messages with v1.0.0 remain valid
- Database schema doesn't need migration
- UI components can render both versions

## Current Limitations

### 1. Version Selection
The streaming handler always uses the default version:
```typescript
toolVersion: getToolDefaultVersion(toolName)
```

To support version selection, would need to:
- Accept version in the streaming request
- Validate the version against available versions
- Pass version through to tool execution

### 2. Version-Specific Rendering
The UI doesn't currently show which version was used, though the data is stored.

### 3. Migration Path
No built-in system for migrating data between versions.

## Benefits of This Architecture

1. **Single Source of Truth**: Define versions once in `tools.ts`
2. **Automatic Propagation**: Types flow through the entire system
3. **Type Safety**: Can't use invalid versions or wrong schemas
4. **Extensibility**: Easy to add new versions or tools
5. **Runtime Validation**: Convex validators ensure data integrity

## Future Enhancements

1. **Dynamic Version Selection**: Allow clients to specify tool version
2. **Version Display**: Show version info in UI
3. **Version Migration**: Tools to upgrade stored data between versions
4. **A/B Testing**: Compare performance between versions
5. **Deprecation**: Mark old versions as deprecated while maintaining compatibility