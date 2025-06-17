import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { ALL_MODEL_IDS } from "../src/lib/ai/types.js"
import { internal } from "./_generated/api.js"
import { mutation, query } from "./_generated/server.js"

// Create a new thread
export const create = mutation({
  args: {
    title: v.string(),
    clientId: v.optional(v.string()), // Allow client-generated ID for instant navigation
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    // Check for collision if clientId is provided (extremely rare with nanoid)
    if (args.clientId) {
      const existing = await ctx.db
        .query("threads")
        .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
        .first()

      if (existing) {
        throw new Error(`Thread with clientId ${args.clientId} already exists`)
      }
    }

    const now = Date.now()
    return await ctx.db.insert("threads", {
      clientId: args.clientId,
      title: args.title,
      userId: userId,
      createdAt: now,
      lastMessageAt: now,
      isTitleGenerating: true, // New threads start with title generation pending
      // Initialize usage field so header displays even with 0 tokens
      usage: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalReasoningTokens: 0,
        totalCachedInputTokens: 0,
        messageCount: 0,
        modelStats: {},
      },
    })
  },
})

// List threads for a user
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("threads"),
      _creationTime: v.number(),
      clientId: v.optional(v.string()),
      title: v.string(),
      userId: v.id("users"),
      createdAt: v.number(),
      lastMessageAt: v.number(),
      isTitleGenerating: v.optional(v.boolean()),
      isGenerating: v.optional(v.boolean()),
      pinned: v.optional(v.boolean()),
      // Branch information
      branchedFrom: v.optional(
        v.object({
          threadId: v.id("threads"),
          messageId: v.id("messages"),
          timestamp: v.number(),
        }),
      ),
      // Share functionality
      isPublic: v.optional(v.boolean()),
      shareId: v.optional(v.string()),
      sharedAt: v.optional(v.number()),
      shareSettings: v.optional(
        v.object({
          showThinking: v.optional(v.boolean()),
        }),
      ),
      // Thread-level usage tracking (denormalized for performance)
      usage: v.optional(
        v.object({
          totalInputTokens: v.number(),
          totalOutputTokens: v.number(),
          totalTokens: v.number(),
          totalReasoningTokens: v.number(),
          totalCachedInputTokens: v.number(),
          messageCount: v.number(),
          // Dynamic model tracking - scales to any number of models/providers
          modelStats: v.record(
            v.string(),
            v.object({
              messageCount: v.number(),
              inputTokens: v.number(),
              outputTokens: v.number(),
              totalTokens: v.number(),
              reasoningTokens: v.number(),
              cachedInputTokens: v.number(),
            }),
          ),
        }),
      ),
    }),
  ),
  handler: async (ctx, _args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    return await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})

// Get a specific thread
export const get = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.union(
    v.object({
      _id: v.id("threads"),
      _creationTime: v.number(),
      clientId: v.optional(v.string()),
      title: v.string(),
      userId: v.id("users"),
      createdAt: v.number(),
      lastMessageAt: v.number(),
      isTitleGenerating: v.optional(v.boolean()),
      isGenerating: v.optional(v.boolean()),
      pinned: v.optional(v.boolean()),
      // Branch information
      branchedFrom: v.optional(
        v.object({
          threadId: v.id("threads"),
          messageId: v.id("messages"),
          timestamp: v.number(),
        }),
      ),
      // Share functionality
      isPublic: v.optional(v.boolean()),
      shareId: v.optional(v.string()),
      sharedAt: v.optional(v.number()),
      shareSettings: v.optional(
        v.object({
          showThinking: v.optional(v.boolean()),
        }),
      ),
      // Thread-level usage tracking (denormalized for performance)
      usage: v.optional(
        v.object({
          totalInputTokens: v.number(),
          totalOutputTokens: v.number(),
          totalTokens: v.number(),
          totalReasoningTokens: v.number(),
          totalCachedInputTokens: v.number(),
          messageCount: v.number(),
          // Dynamic model tracking - scales to any number of models/providers
          modelStats: v.record(
            v.string(),
            v.object({
              messageCount: v.number(),
              inputTokens: v.number(),
              outputTokens: v.number(),
              totalTokens: v.number(),
              reasoningTokens: v.number(),
              cachedInputTokens: v.number(),
            }),
          ),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    const thread = await ctx.db.get(args.threadId)

    // Only return the thread if it belongs to the current user
    if (thread && thread.userId === userId) {
      return thread
    }

    return null
  },
})

// Get a thread by clientId (for instant navigation)
export const getByClientId = query({
  args: {
    clientId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("threads"),
      _creationTime: v.number(),
      clientId: v.optional(v.string()),
      title: v.string(),
      userId: v.id("users"),
      createdAt: v.number(),
      lastMessageAt: v.number(),
      isTitleGenerating: v.optional(v.boolean()),
      isGenerating: v.optional(v.boolean()),
      pinned: v.optional(v.boolean()),
      // Branch information
      branchedFrom: v.optional(
        v.object({
          threadId: v.id("threads"),
          messageId: v.id("messages"),
          timestamp: v.number(),
        }),
      ),
      // Share functionality
      isPublic: v.optional(v.boolean()),
      shareId: v.optional(v.string()),
      sharedAt: v.optional(v.number()),
      shareSettings: v.optional(
        v.object({
          showThinking: v.optional(v.boolean()),
        }),
      ),
      // Thread-level usage tracking (denormalized for performance)
      usage: v.optional(
        v.object({
          totalInputTokens: v.number(),
          totalOutputTokens: v.number(),
          totalTokens: v.number(),
          totalReasoningTokens: v.number(),
          totalCachedInputTokens: v.number(),
          messageCount: v.number(),
          // Dynamic model tracking - scales to any number of models/providers
          modelStats: v.record(
            v.string(),
            v.object({
              messageCount: v.number(),
              inputTokens: v.number(),
              outputTokens: v.number(),
              totalTokens: v.number(),
              reasoningTokens: v.number(),
              cachedInputTokens: v.number(),
            }),
          ),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    const thread = await ctx.db
      .query("threads")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    return thread
  },
})

// Update thread's last message timestamp
export const updateLastMessage = mutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or access denied")
    }

    await ctx.db.patch(args.threadId, {
      lastMessageAt: Date.now(),
    })
    return null
  },
})

// Update thread title
export const updateTitle = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or access denied")
    }

    await ctx.db.patch(args.threadId, {
      title: args.title,
    })
    return null
  },
})

// Delete a thread and all its messages
export const deleteThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or access denied")
    }

    // First delete all messages in the thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect()

    // Delete all messages
    for (const message of messages) {
      await ctx.db.delete(message._id)
    }

    // Clean up share access logs if thread was shared
    if (thread.shareId) {
      const shareAccessEntries = await ctx.db
        .query("shareAccess")
        .withIndex("by_share_id", (q) => q.eq("shareId", thread.shareId!))
        .collect()

      // Delete all share access logs for this thread
      for (const entry of shareAccessEntries) {
        await ctx.db.delete(entry._id)
      }
    }

    // Finally delete the thread
    await ctx.db.delete(args.threadId)
    return null
  },
})

// Toggle thread pinned state
export const togglePinned = mutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or access denied")
    }

    await ctx.db.patch(args.threadId, {
      pinned: !thread.pinned,
    })
    return null
  },
})

// Create a new thread branched from a specific message
export const branchFromMessage = mutation({
  args: {
    originalThreadId: v.id("threads"),
    branchFromMessageId: v.id("messages"),
    modelId: v.union(...ALL_MODEL_IDS.map((id) => v.literal(id))),
    clientId: v.optional(v.string()), // Support clientId for instant navigation
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    // Verify access to original thread
    const originalThread = await ctx.db.get(args.originalThreadId)
    if (!originalThread || originalThread.userId !== userId) {
      throw new Error("Original thread not found or access denied")
    }

    // Get all messages up to and including the branch point
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.originalThreadId))
      .order("asc")
      .collect()

    // Find the branch point message
    const branchPointIndex = allMessages.findIndex(
      (msg) => msg._id === args.branchFromMessageId,
    )

    if (branchPointIndex === -1) {
      throw new Error("Branch point message not found")
    }

    // Find the last user message before or at the branch point
    let lastUserMessageIndex = -1
    for (let i = branchPointIndex; i >= 0; i--) {
      if (allMessages[i].messageType === "user") {
        lastUserMessageIndex = i
        break
      }
    }

    // If no user message found before branch point, include all messages up to branch point
    const copyUpToIndex =
      lastUserMessageIndex !== -1 ? lastUserMessageIndex : branchPointIndex

    // Get messages to copy (up to and including the last user message before branch point)
    const messagesToCopy = allMessages.slice(0, copyUpToIndex + 1)

    // Check for clientId collision if provided (extremely rare with nanoid)
    if (args.clientId) {
      const existing = await ctx.db
        .query("threads")
        .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
        .first()

      if (existing) {
        throw new Error(`Thread with clientId ${args.clientId} already exists`)
      }
    }

    // Create new thread with branch info
    const now = Date.now()
    const newThreadId = await ctx.db.insert("threads", {
      clientId: args.clientId, // Support instant navigation
      title: originalThread.title,
      userId: userId,
      createdAt: now,
      lastMessageAt: now,
      isGenerating: true, // Set to true since we'll generate AI response
      branchedFrom: {
        threadId: args.originalThreadId,
        messageId: args.branchFromMessageId,
        timestamp: now,
      },
      // Initialize usage field so header displays even with 0 tokens
      usage: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalReasoningTokens: 0,
        totalCachedInputTokens: 0,
        messageCount: 0,
        modelStats: {},
      },
    })

    // Copy messages to new thread and accumulate usage
    let lastUserMessage = ""
    const accumulatedUsage = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalReasoningTokens: 0,
      totalCachedInputTokens: 0,
      messageCount: 0,
      modelStats: {} as Record<
        string,
        {
          messageCount: number
          inputTokens: number
          outputTokens: number
          totalTokens: number
          reasoningTokens: number
          cachedInputTokens: number
        }
      >,
    }

    for (const message of messagesToCopy) {
      await ctx.db.insert("messages", {
        threadId: newThreadId,
        body: message.body,
        timestamp: message.timestamp,
        messageType: message.messageType,
        model: message.model,
        modelId: message.modelId,
        attachments: message.attachments,
        isComplete: true,
        // Don't copy streaming-related fields
        usage: message.usage,
        thinkingContent: message.thinkingContent,
        hasThinkingContent: message.hasThinkingContent,
      })

      // Track the last user message for AI response
      if (message.messageType === "user") {
        lastUserMessage = message.body
      }

      // Accumulate usage from assistant messages
      if (message.messageType === "assistant" && message.usage) {
        const usage = message.usage
        accumulatedUsage.totalInputTokens += usage.inputTokens || 0
        accumulatedUsage.totalOutputTokens += usage.outputTokens || 0
        accumulatedUsage.totalTokens += usage.totalTokens || 0
        accumulatedUsage.totalReasoningTokens += usage.reasoningTokens || 0
        accumulatedUsage.totalCachedInputTokens += usage.cachedInputTokens || 0
        accumulatedUsage.messageCount += 1

        // Update model stats
        const modelId = message.modelId || message.model || "unknown"
        if (!accumulatedUsage.modelStats[modelId]) {
          accumulatedUsage.modelStats[modelId] = {
            messageCount: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            reasoningTokens: 0,
            cachedInputTokens: 0,
          }
        }
        const stats = accumulatedUsage.modelStats[modelId]
        stats.messageCount += 1
        stats.inputTokens += usage.inputTokens || 0
        stats.outputTokens += usage.outputTokens || 0
        stats.totalTokens += usage.totalTokens || 0
        stats.reasoningTokens += usage.reasoningTokens || 0
        stats.cachedInputTokens += usage.cachedInputTokens || 0
      }
    }

    // Update the thread with accumulated usage
    if (accumulatedUsage.messageCount > 0) {
      await ctx.db.patch(newThreadId, { usage: accumulatedUsage })
    }

    // Schedule AI response with the selected model
    if (lastUserMessage) {
      await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
        threadId: newThreadId,
        userMessage: lastUserMessage,
        modelId: args.modelId,
      })
    }

    return newThreadId
  },
})
