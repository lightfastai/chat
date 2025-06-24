import { v } from "convex/values"
import { internalAction } from "../_generated/server.js"
import { internal } from "../_generated/api.js"

/**
 * Check if a computer instance is ready for a thread.
 * This action is designed to be retried by the Action Retrier component.
 */
export const checkComputerReadiness = internalAction({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.object({
    isReady: v.boolean(),
    instanceId: v.optional(v.string()),
    lifecycleState: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    isReady: boolean
    instanceId?: string
    lifecycleState?: string
  }> => {
    // Get thread to check computer status
    const thread = await ctx.runQuery(internal.messages.getThreadById, {
      threadId: args.threadId,
    })

    if (!thread) {
      throw new Error(`Thread ${args.threadId} not found`)
    }

    const isReady =
      thread.computerStatus?.lifecycleState === "idle" ||
      thread.computerStatus?.lifecycleState === "ready"

    // If not ready, throw an error so the retrier will retry
    if (!isReady) {
      console.log("Computer instance not ready, will retry:", {
        threadId: args.threadId,
        lifecycleState: thread.computerStatus?.lifecycleState,
        instanceId: thread.computerStatus?.instanceId,
      })
      throw new Error(
        `Computer instance not ready: ${thread.computerStatus?.lifecycleState || "unknown"}`,
      )
    }

    console.log("Computer instance is ready:", {
      threadId: args.threadId,
      instanceId: thread.computerStatus?.instanceId,
      lifecycleState: thread.computerStatus?.lifecycleState,
    })

    return {
      isReady: true,
      instanceId: thread.computerStatus?.instanceId,
      lifecycleState: thread.computerStatus?.lifecycleState,
    }
  },
})