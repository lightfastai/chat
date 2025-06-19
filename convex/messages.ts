// This is a temporary clean version with the large AI functions removed
// to break circular dependencies

import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server.js"

import {
  clientIdValidator,
  modelIdValidator,
  modelProviderValidator,
  streamIdValidator,
} from "./validators.js"

// Export the most essential functions for now
export const list = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Verify user has access to the thread
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) return []

    // Get messages for this thread
    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect()
  },
})

export const send = mutation({
  args: {
    threadId: v.id("threads"),
    body: v.string(),
    clientId: clientIdValidator,
    attachments: v.optional(v.array(v.id("files"))),
    webSearchEnabled: v.optional(v.boolean()),
    modelId: modelIdValidator,
  },
  returns: v.object({
    messageId: v.id("messages"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("You must be logged in to send messages")
    }

    // Basic message creation - simplified for now
    const messageId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      body: args.body,
      timestamp: Date.now(),
      messageType: "user",
      model: undefined,
      modelId: undefined,
      isStreaming: false,
      isComplete: true,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        reasoningTokens: 0,
        cachedInputTokens: 0,
      },
    })

    // TODO: Add AI response scheduling once circular dependency is fixed
    console.log("AI response scheduled for:", args.threadId)

    return { messageId }
  },
})

// Basic internal mutations for the streaming infrastructure
export const createStreamingMessage = internalMutation({
  args: {
    threadId: v.id("threads"),
    body: v.string(),
    messageType: v.union(v.literal("user"), v.literal("assistant")),
    model: v.optional(modelProviderValidator),
    modelId: v.optional(modelIdValidator),
    streamId: streamIdValidator,
    isStreaming: v.boolean(),
    isComplete: v.boolean(),
    usage: v.object({
      inputTokens: v.number(),
      outputTokens: v.number(),
      totalTokens: v.number(),
      reasoningTokens: v.number(),
      cachedInputTokens: v.number(),
    }),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      threadId: args.threadId,
      body: args.body,
      timestamp: Date.now(),
      messageType: args.messageType,
      model: args.model,
      modelId: args.modelId,
      isStreaming: args.isStreaming,
      isComplete: args.isComplete,
      streamId: args.streamId,
      usage: args.usage,
    })
  },
})

// Basic query for thread usage (simplified)
export const getThreadUsage = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.object({
    totalTokens: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.number(),
    cachedInputTokens: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cachedInputTokens: 0,
      }
    }

    // Verify user has access to the thread
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cachedInputTokens: 0,
      }
    }

    // Get all messages for this thread and sum up usage
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect()

    const usage = messages.reduce(
      (acc, msg) => {
        if (msg.usage) {
          acc.totalTokens += msg.usage.totalTokens || 0
          acc.inputTokens += msg.usage.inputTokens || 0
          acc.outputTokens += msg.usage.outputTokens || 0
          acc.reasoningTokens += msg.usage.reasoningTokens || 0
          acc.cachedInputTokens += msg.usage.cachedInputTokens || 0
        }
        return acc
      },
      {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cachedInputTokens: 0,
      },
    )

    return usage
  },
})

// TODO: Add other essential functions as needed
// The AI generation functions have been moved to ai.ts to break circular dependencies
