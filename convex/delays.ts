import { v } from "convex/values"
import { internalAction } from "./_generated/server.js"

// Action to handle development delays that can't be done in mutations
export const developmentDelay = internalAction({
  args: {
    minMs: v.number(),
    maxMs: v.number(),
    operation: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    if (process.env.NODE_ENV === "development") {
      const delay =
        Math.floor(Math.random() * (args.maxMs - args.minMs)) + args.minMs
      console.log(`[DEV TIMING] ${args.operation} - Adding ${delay}ms delay`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    return null
  },
})

// Action to handle retry delays (for the updateThreadUsage function)
export const retryDelay = internalAction({
  args: {
    retryCount: v.number(),
    baseDelayMs: v.number(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const delay = args.baseDelayMs * args.retryCount
    await new Promise((resolve) => setTimeout(resolve, delay))
    return null
  },
})
