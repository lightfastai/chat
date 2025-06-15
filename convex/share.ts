import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { nanoid } from "nanoid"
import { mutation, query } from "./_generated/server"

export const shareThread = mutation({
  args: {
    threadId: v.id("threads"),
    settings: v.optional(
      v.object({
        allowFeedback: v.optional(v.boolean()),
        showThinking: v.optional(v.boolean()),
        expiresAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Unauthorized")
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread) {
      throw new Error("Thread not found")
    }

    if (thread.userId !== userId) {
      throw new Error("Unauthorized: You don't own this thread")
    }

    // Generate a unique share ID if not already shared
    const shareId = thread.shareId || nanoid(10)
    const now = Date.now()

    await ctx.db.patch(args.threadId, {
      isPublic: true,
      shareId,
      sharedAt: thread.sharedAt || now,
      shareSettings: args.settings ||
        thread.shareSettings || {
          allowFeedback: false,
          showThinking: false,
        },
    })

    return { shareId }
  },
})

export const unshareThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Unauthorized")
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread) {
      throw new Error("Thread not found")
    }

    if (thread.userId !== userId) {
      throw new Error("Unauthorized: You don't own this thread")
    }

    await ctx.db.patch(args.threadId, {
      isPublic: false,
    })

    return { success: true }
  },
})

export const updateShareSettings = mutation({
  args: {
    threadId: v.id("threads"),
    settings: v.object({
      allowFeedback: v.optional(v.boolean()),
      showThinking: v.optional(v.boolean()),
      expiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Unauthorized")
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread) {
      throw new Error("Thread not found")
    }

    if (thread.userId !== userId) {
      throw new Error("Unauthorized: You don't own this thread")
    }

    if (!thread.isPublic) {
      throw new Error("Thread is not shared")
    }

    await ctx.db.patch(args.threadId, {
      shareSettings: {
        ...thread.shareSettings,
        ...args.settings,
      },
    })

    return { success: true }
  },
})

export const getSharedThread = query({
  args: {
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find thread by shareId
    const thread = await ctx.db
      .query("threads")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first()

    if (!thread || !thread.isPublic) {
      return null
    }

    // Check if share link has expired
    if (
      thread.shareSettings?.expiresAt &&
      thread.shareSettings.expiresAt < Date.now()
    ) {
      return null
    }

    // Get all messages for the thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
      .collect()

    // Filter out thinking content if not allowed
    const filteredMessages = messages.map((msg) => {
      if (
        !thread.shareSettings?.showThinking &&
        (msg.thinkingContent || msg.isThinking)
      ) {
        return {
          ...msg,
          thinkingContent: undefined,
          isThinking: false,
          hasThinkingContent: false,
        }
      }
      return msg
    })

    // Get thread owner info (just name/avatar for display)
    const owner = await ctx.db.get(thread.userId)

    return {
      thread: {
        _id: thread._id,
        title: thread.title,
        createdAt: thread.createdAt,
        lastMessageAt: thread.lastMessageAt,
        shareSettings: thread.shareSettings,
      },
      messages: filteredMessages,
      owner: owner
        ? {
            name: owner.name,
            image: owner.image,
          }
        : null,
    }
  },
})

export const getThreadShareInfo = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return null
    }

    return {
      isPublic: thread.isPublic || false,
      shareId: thread.shareId,
      sharedAt: thread.sharedAt,
      shareSettings: thread.shareSettings,
    }
  },
})
