# TypeScript Deep Instantiation Limits in Staging Environment

## Issue

The staging environment's Convex schema has reached TypeScript's deep instantiation limits. This prevents us from adding properly typed validators for complex fields like the `parts` array in the messages table.

## Symptoms

When attempting to add properly typed validators (e.g., union types with object structures), the build fails with:
```
Type error: Type instantiation is excessively deep and possibly infinite.
```

## Root Cause

The messages table has 18+ fields with complex validators including:
- Large union types (modelIdValidator with 30+ model IDs)
- Nested object validators (tokenUsageValidator, streamChunkValidator)
- Multiple array fields

Adding another complex field pushes TypeScript's type inference beyond its depth limit.

## Current Workaround

For the `parts` field, we use `v.array(v.object({}))` instead of proper validators. This allows the build to succeed while still storing the data correctly. Runtime validation should be implemented in mutations to ensure data integrity.

## Proper Structure (for reference)

```typescript
// What we want to use but can't due to TypeScript limits:
const textPartValidator = v.object({
  type: v.literal("text"),
  text: v.string(),
});

const toolCallPartValidator = v.object({
  type: v.literal("tool-call"),
  toolCallId: v.string(),
  toolName: v.string(),
  args: v.optional(v.any()),
  result: v.optional(v.any()),
  state: v.union(
    v.literal("partial-call"),
    v.literal("call"),
    v.literal("result"),
  ),
  step: v.optional(v.number()),
});

const messagePartValidator = v.union(textPartValidator, toolCallPartValidator);
parts: v.optional(v.array(messagePartValidator))
```

## Long-term Solutions

1. **Schema Refactoring**: Break up the messages table into smaller related tables
2. **Simplify Validators**: Use simpler types where possible (e.g., strings instead of large unions)
3. **TypeScript Configuration**: Wait for TypeScript updates that may increase depth limits
4. **Runtime Validation**: Move complex validation logic to runtime checks in mutations

## Impact

- Type safety is reduced for the `parts` field
- IntelliSense won't provide proper autocompletion
- Runtime validation must be implemented carefully to maintain data integrity