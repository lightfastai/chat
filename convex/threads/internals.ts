import { v } from "convex/values"
import { internalMutation } from "../_generated/server.js"
import { computerStatusValidator } from "../validators.js"

/**
 * Update computer status for a thread (internal use only)
 */
export const updateComputerStatus = internalMutation({
  args: {
    threadId: v.id("threads"),
    status: computerStatusValidator,
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
