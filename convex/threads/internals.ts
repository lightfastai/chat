import { v } from "convex/values"
import { internalMutation } from "../_generated/server.js"

/**
 * Update computer status for a thread (internal use only)
 */
export const updateComputerStatus = internalMutation({
  args: {
    threadId: v.id("threads"),
    status: v.object({
      isRunning: v.boolean(),
      instanceId: v.optional(v.string()),
      currentOperation: v.optional(v.string()),
      startedAt: v.number(),
      lastUpdateAt: v.optional(v.number()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      computerStatus: args.status,
    })
    return null
  },
})

/**
 * Clear computer status for a thread (internal use only)
 */
export const clearComputerStatus = internalMutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      computerStatus: undefined,
    })
    return null
  },
})
