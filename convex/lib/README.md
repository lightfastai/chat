# Convex Development Timing Middleware

This directory contains development utilities for the Convex backend, including timing middleware that simulates production latency during local development.

## Timing Middleware

The timing middleware adds artificial delays to Convex functions during development to simulate real-world network latency and help identify performance issues early.

### Features

- **Artificial Delays**: Adds 100-500ms random delay to each function call
- **Execution Timing**: Logs total execution time including the artificial delay
- **Color-coded Logs**: Green (<300ms), Yellow (300-600ms), Red (>600ms)
- **Automatic in Dev**: Enabled by default in development mode
- **Zero Production Impact**: Completely disabled in production

### Usage

#### Option 1: Using Wrapper Functions (Recommended)

```typescript
import { query, mutation } from "./_generated/server.js"
import { wrapQuery, wrapMutation } from "./lib/hooks.js"

// Wrap your query handler
export const listMessages = query({
  args: { threadId: v.id("threads") },
  handler: wrapQuery("messages.list", async (ctx, args) => {
    // Your query logic here
    return await ctx.db.query("messages")...
  }),
})

// Wrap your mutation handler
export const createThread = mutation({
  args: { title: v.string() },
  handler: wrapMutation("threads.create", async (ctx, args) => {
    // Your mutation logic here
    return await ctx.db.insert("threads", {...})
  }),
})
```

#### Option 2: Using Custom Imports (Experimental)

```typescript
// Instead of importing from ./_generated/server.js
import { query, mutation } from "./lib/timing.js"

// Use as normal - timing is automatically applied
export const myQuery = query({
  args: {},
  handler: async (ctx) => {
    // Your logic here
  },
})
```

### Configuration

The timing middleware can be configured through environment variables:

- `CONVEX_TIMING_ENABLED`: Set to "true" to enable (default: enabled in development)
- `NODE_ENV`: Automatically enables when set to "development"

### Example Output

```
[32m[Convex Query][0m threads.list took [32m287ms[0m to execute (includes 187ms artificial delay)
[33m[Convex Mutation][0m messages.send took [33m456ms[0m to execute (includes 256ms artificial delay)
[31m[Convex Query ERROR][0m users.get failed after 623ms
```

### Best Practices

1. **Use meaningful function names**: The first parameter to wrap functions should describe the operation
2. **Wrap critical paths**: Focus on user-facing queries and mutations
3. **Monitor logs**: Watch for functions that are slow even without the artificial delay
4. **Test loading states**: The delays help ensure your UI handles loading states properly

### Files

- `hooks.ts`: Contains the timing wrapper functions
- `timing.ts`: Experimental module replacement approach (use with caution)

### Notes

- The timing middleware helps simulate real-world conditions during development
- It's particularly useful for testing optimistic updates and loading states
- The random delay (100-500ms) simulates variable network conditions
- All timing is disabled in production for zero performance impact