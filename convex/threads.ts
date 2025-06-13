import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
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
      // Branch relationship tracking
      parentThreadId: v.optional(v.id("threads")),
      branchFromMessageId: v.optional(v.id("messages")),
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
      // Branch relationship tracking
      parentThreadId: v.optional(v.id("threads")),
      branchFromMessageId: v.optional(v.id("messages")),
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
      // Branch relationship tracking
      parentThreadId: v.optional(v.id("threads")),
      branchFromMessageId: v.optional(v.id("messages")),
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

    // Finally delete the thread
    await ctx.db.delete(args.threadId)
    return null
  },
})

// Create a branch from an existing message
export const createBranch = mutation({
  args: {
    parentThreadId: v.id("threads"),
    branchFromMessageId: v.id("messages"),
    title: v.string(),
    clientId: v.optional(v.string()),
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    // Verify access to parent thread
    const parentThread = await ctx.db.get(args.parentThreadId)
    if (!parentThread || parentThread.userId !== userId) {
      throw new Error("Parent thread not found or access denied")
    }

    // Verify the message exists and belongs to the parent thread
    const branchMessage = await ctx.db.get(args.branchFromMessageId)
    if (!branchMessage || branchMessage.threadId !== args.parentThreadId) {
      throw new Error(
        "Branch message not found or does not belong to parent thread",
      )
    }

    // Check for collision if clientId is provided
    if (args.clientId) {
      const existing = await ctx.db
        .query("threads")
        .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
        .first()

      if (existing) {
        throw new Error(`Thread with clientId ${args.clientId} already exists`)
      }
    }

    // Create the new thread with branch relationship
    const now = Date.now()
    const newThreadId = await ctx.db.insert("threads", {
      clientId: args.clientId,
      title: args.title,
      userId: userId,
      createdAt: now,
      lastMessageAt: now,
      isTitleGenerating: true,
      parentThreadId: args.parentThreadId,
      branchFromMessageId: args.branchFromMessageId,
    })

    // Copy all messages from parent thread up to and including the branch point
    const messagesToCopy = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.parentThreadId))
      .filter((q) => q.lte(q.field("timestamp"), branchMessage.timestamp))
      .collect()

    // Sort messages by timestamp to maintain order
    messagesToCopy.sort((a, b) => a.timestamp - b.timestamp)

    // Copy messages to the new thread
    for (const message of messagesToCopy) {
      await ctx.db.insert("messages", {
        threadId: newThreadId,
        body: message.body,
        timestamp: message.timestamp,
        messageType: message.messageType,
        model: message.model,
        modelId: message.modelId,
        usage: message.usage,
        // Note: Not copying streaming-related fields as these are historical messages
      })
    }

    return newThreadId
  },
})
