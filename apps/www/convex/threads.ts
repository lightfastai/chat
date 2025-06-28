import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { internal } from "./_generated/api.js"
import { mutation, query } from "./_generated/server.js"
import { getAuthenticatedUserId } from "./lib/auth.js"
import { getWithOwnership } from "./lib/database.js"
import { requireResource, throwConflictError } from "./lib/errors.js"
import {
  branchInfoValidator,
  clientIdValidator,
  modelIdValidator,
  shareIdValidator,
  shareSettingsValidator,
  threadUsageValidator,
  titleValidator,
} from "./validators.js"

// Thread object validator used in returns
const threadObjectValidator = v.object({
  _id: v.id("threads"),
  _creationTime: v.number(),
  clientId: v.optional(clientIdValidator),
  title: titleValidator,
  userId: v.id("users"),
  createdAt: v.number(),
  lastMessageAt: v.number(),
  isTitleGenerating: v.optional(v.boolean()),
  isGenerating: v.optional(v.boolean()),
  pinned: v.optional(v.boolean()),
  // Branch information
  branchedFrom: branchInfoValidator,
  // Share functionality
  isPublic: v.optional(v.boolean()),
  shareId: v.optional(shareIdValidator),
  sharedAt: v.optional(v.number()),
  shareSettings: shareSettingsValidator,
  // Thread-level usage tracking (denormalized for performance)
  usage: threadUsageValidator,
})

// Create a new thread
export const create = mutation({
  args: {
    title: titleValidator,
    clientId: v.optional(clientIdValidator), // Allow client-generated ID for instant navigation
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)

    // Check for collision if clientId is provided (extremely rare with nanoid)
    if (args.clientId) {
      const existing = await ctx.db
        .query("threads")
        .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
        .first()

      if (existing) {
        throwConflictError(
          `Thread with clientId ${args.clientId} already exists`,
        )
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
// List initial threads for preloading (first 20)
export const list = query({
  args: {},
  returns: v.array(threadObjectValidator),
  handler: async (ctx, _args) => {
    try {
      const userId = await getAuthenticatedUserId(ctx)
      // Return first 20 threads for initial preload
      return await ctx.db
        .query("threads")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(20)
    } catch {
      // Return empty array for unauthenticated users
      return []
    }
  },
})

// List paginated threads for a user (for infinite scroll)
export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(threadObjectValidator),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthenticatedUserId(ctx)
      return await ctx.db
        .query("threads")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("pinned"), undefined)) // Exclude pinned threads
        .order("desc")
        .paginate(args.paginationOpts)
    } catch {
      // Return empty page for unauthenticated users
      return {
        page: [],
        isDone: true,
        continueCursor: null,
      }
    }
  },
})

// List pinned threads for a user (always loaded, not paginated)
export const listPinned = query({
  args: {},
  returns: v.array(threadObjectValidator),
  handler: async (ctx, _args) => {
    try {
      const userId = await getAuthenticatedUserId(ctx)
      return await ctx.db
        .query("threads")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("pinned"), true))
        .order("desc")
        .collect()
    } catch {
      // Return empty array for unauthenticated users
      return []
    }
  },
})

// Helper function to determine date category for a thread
function getDateCategory(lastMessageAt: number): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const threadDate = new Date(lastMessageAt)

  if (threadDate >= today) return "Today"
  if (threadDate >= yesterday) return "Yesterday"
  if (threadDate >= weekAgo) return "This Week"
  if (threadDate >= monthAgo) return "This Month"
  return "Older"
}

// Thread with date category for grouped results
const threadWithCategoryValidator = v.object({
  ...threadObjectValidator.fields,
  dateCategory: v.string(),
})

// List paginated threads with server-side date grouping (5 items per page for smooth loading)
export const listPaginatedWithGrouping = query({
  args: {
    paginationOpts: paginationOptsValidator,
    skipFirst: v.optional(v.number()), // Skip the first N items (for after preload)
  },
  returns: v.object({
    page: v.array(threadWithCategoryValidator),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthenticatedUserId(ctx)

      // Build the query
      let query = ctx.db
        .query("threads")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("pinned"), undefined)) // Exclude pinned threads
        .order("desc")

      // Skip the first N items only on the first paginated call (no cursor)
      if (args.skipFirst && args.skipFirst > 0 && !args.paginationOpts.cursor) {
        // This is the first paginated call after preload, so we need to skip
        const itemsToSkip = await query.take(args.skipFirst)
        if (itemsToSkip.length === args.skipFirst) {
          // Get the last item's timestamp to continue from there
          const lastSkipped = itemsToSkip[itemsToSkip.length - 1]
          query = ctx.db
            .query("threads")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) =>
              q.and(
                q.eq(q.field("pinned"), undefined),
                q.lt(q.field("lastMessageAt"), lastSkipped.lastMessageAt),
              ),
            )
            .order("desc")
        }
      }

      const result = await query.paginate(args.paginationOpts)

      // Add date categories to each thread
      const threadsWithCategories = result.page.map((thread) => ({
        ...thread,
        dateCategory: getDateCategory(thread.lastMessageAt),
      }))

      return {
        page: threadsWithCategories,
        isDone: result.isDone,
        continueCursor: result.continueCursor,
      }
    } catch {
      // Return empty page for unauthenticated users
      return {
        page: [],
        isDone: true,
        continueCursor: null,
      }
    }
  },
})

// Get a specific thread
export const get = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.union(threadObjectValidator, v.null()),
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthenticatedUserId(ctx)
      return await getWithOwnership(ctx.db, "threads", args.threadId, userId)
    } catch {
      // Return null for unauthenticated users or threads they don't own
      return null
    }
  },
})

// Get a thread by clientId (for instant navigation)
export const getByClientId = query({
  args: {
    clientId: clientIdValidator,
  },
  returns: v.union(threadObjectValidator, v.null()),
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthenticatedUserId(ctx)
      const thread = await ctx.db
        .query("threads")
        .withIndex("by_user_client", (q) =>
          q.eq("userId", userId).eq("clientId", args.clientId),
        )
        .first()
      return thread
    } catch {
      // Return null for unauthenticated users
      return null
    }
  },
})

// Update thread's last message timestamp
export const updateLastMessage = mutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    await getWithOwnership(ctx.db, "threads", args.threadId, userId)

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
    title: titleValidator,
  },
  returns: v.object({
    title: titleValidator,
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    await getWithOwnership(ctx.db, "threads", args.threadId, userId)

    await ctx.db.patch(args.threadId, {
      title: args.title,
    })
    return { title: args.title }
  },
})

// Delete a thread and all its messages
export const deleteThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const thread = await getWithOwnership(
      ctx.db,
      "threads",
      args.threadId,
      userId,
    )

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
  returns: v.object({
    pinned: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)
    const thread = await getWithOwnership(
      ctx.db,
      "threads",
      args.threadId,
      userId,
    )

    const newPinnedState = !thread.pinned
    await ctx.db.patch(args.threadId, {
      pinned: newPinnedState,
    })
    return { pinned: newPinnedState }
  },
})

// Create a new thread branched from a specific message
export const branchFromMessage = mutation({
  args: {
    originalThreadId: v.id("threads"),
    branchFromMessageId: v.id("messages"),
    modelId: modelIdValidator,
    clientId: v.optional(clientIdValidator), // Support clientId for instant navigation
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)

    // Verify access to original thread
    const originalThread = await getWithOwnership(
      ctx.db,
      "threads",
      args.originalThreadId,
      userId,
    )

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

    requireResource(branchPointIndex !== -1, "Branch point message")

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
        throwConflictError(
          `Thread with clientId ${args.clientId} already exists`,
        )
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
        parts: message.parts,
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
