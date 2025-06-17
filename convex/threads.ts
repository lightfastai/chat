import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { ALL_MODEL_IDS } from "../src/lib/ai/types.js"
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

    // Create new thread with branch info
    const now = Date.now()
    const newThreadId = await ctx.db.insert("threads", {
      title: originalThread.title,
      userId: userId,
      createdAt: now,
      lastMessageAt: now,
      branchedFrom: {
        threadId: args.originalThreadId,
        messageId: args.branchFromMessageId,
        timestamp: now,
      },
    })

    // Copy messages to new thread
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
    }

    return newThreadId
  },
})
