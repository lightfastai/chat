import { v } from "convex/values"
import { internal } from "../_generated/api.js"
import { internalAction } from "../_generated/server.js"
import { env } from "../env.js"
import { ComputerInstanceManager } from "../messages/computer_instance_manager.js"

/**
 * Initialize a computer instance for a newly created thread
 */
export const initializeComputer = internalAction({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`Initializing computer for thread ${args.threadId}`)

    try {
      // Check if environment variables are configured
      if (!env.FLY_API_TOKEN || !env.FLY_APP_NAME) {
        console.log("Computer SDK not configured, skipping initialization")
        return null
      }

      // Create instance manager for this thread
      const instanceManager = new ComputerInstanceManager({
        threadId: args.threadId,
        flyApiToken: env.FLY_API_TOKEN,
        flyAppName: env.FLY_APP_NAME,
      })

      // Create the computer instance
      const instance = await instanceManager.getOrCreateInstance()

      // Update thread with computer status
      await ctx.runMutation(internal.threads.internals.updateComputerStatus, {
        threadId: args.threadId,
        status: {
          isRunning: true,
          instanceId: instance.id,
          currentOperation: "Initialized",
          startedAt: Date.now(),
          lastUpdateAt: Date.now(),
        },
      })

      console.log(
        `Computer instance ${instance.id} initialized for thread ${args.threadId}`,
      )
    } catch (error) {
      console.error(
        `Failed to initialize computer for thread ${args.threadId}:`,
        error,
      )
      // Don't throw - we don't want to fail thread creation if computer init fails
    }

    return null
  },
})

/**
 * Clean up computer instance when a thread is deleted
 */
export const cleanupComputer = internalAction({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    console.log(`Cleaning up computer for thread ${args.threadId}`)

    try {
      // Check if environment variables are configured
      if (!env.FLY_API_TOKEN || !env.FLY_APP_NAME) {
        return null
      }

      // Create instance manager for this thread
      const instanceManager = new ComputerInstanceManager({
        threadId: args.threadId,
        flyApiToken: env.FLY_API_TOKEN,
        flyAppName: env.FLY_APP_NAME,
      })

      // Stop the instance
      await instanceManager.stopInstance()

      // Clean up caches
      ComputerInstanceManager.cleanup(args.threadId)

      console.log(`Computer cleaned up for thread ${args.threadId}`)
    } catch (error) {
      console.error(
        `Failed to cleanup computer for thread ${args.threadId}:`,
        error,
      )
      // Don't throw - thread deletion should still succeed
    }

    return null
  },
})
