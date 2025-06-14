import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Submit or update feedback for a message
export const submitFeedback = mutation({
  args: {
    messageId: v.id("messages"),
    rating: v.union(v.literal("positive"), v.literal("negative")),
    comment: v.optional(v.string()),
    reasons: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated to submit feedback")
    }

    // Get the message to find the threadId
    const message = await ctx.db.get(args.messageId)
    if (!message) {
      throw new Error("Message not found")
    }

    // Check if the user has already submitted feedback for this message
    const existingFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_user_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId),
      )
      .first()

    const now = Date.now()

    if (existingFeedback) {
      // Update existing feedback
      await ctx.db.patch(existingFeedback._id, {
        rating: args.rating,
        comment: args.comment,
        reasons: args.reasons,
        updatedAt: now,
      })
      return existingFeedback._id
    }

    // Create new feedback
    return await ctx.db.insert("feedback", {
      messageId: args.messageId,
      userId,
      threadId: message.threadId,
      rating: args.rating,
      comment: args.comment,
      reasons: args.reasons,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// Remove feedback
export const removeFeedback = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated to remove feedback")
    }

    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_user_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId),
      )
      .first()

    if (feedback) {
      await ctx.db.delete(feedback._id)
    }
  },
})

// Get feedback for a specific message by the current user
export const getUserFeedbackForMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    return await ctx.db
      .query("feedback")
      .withIndex("by_user_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId),
      )
      .first()
  },
})

// Get all feedback for a thread (for analytics)
export const getThreadFeedback = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Verify the user owns the thread
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return []
    }

    return await ctx.db
      .query("feedback")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect()
  },
})
