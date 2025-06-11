import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server.js"

// Create a new thread
export const create = mutation({
  args: {
    title: v.string(),
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    const now = Date.now()
    return await ctx.db.insert("threads", {
      title: args.title,
      userId: userId,
      createdAt: now,
      lastMessageAt: now,
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
      title: v.string(),
      userId: v.id("users"),
      createdAt: v.number(),
      lastMessageAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
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
      title: v.string(),
      userId: v.id("users"),
      createdAt: v.number(),
      lastMessageAt: v.number(),
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
