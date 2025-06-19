import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAuthenticatedUserId } from "./lib/auth.js"
import { getOrThrow, getWithOwnership } from "./lib/database.js"
import {
  commentValidator,
  feedbackRatingValidator,
  feedbackReasonsValidator,
} from "./validators"

// Submit or update feedback for a message
export const submitFeedback = mutation({
  args: {
    messageId: v.id("messages"),
    rating: feedbackRatingValidator,
    comment: commentValidator,
    reasons: feedbackReasonsValidator,
  },
  returns: v.id("feedback"),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)

    // Get the message to find the threadId
    const message = await getOrThrow(ctx.db, "messages", args.messageId)

    // Verify user owns the thread containing this message
    await getWithOwnership(ctx.db, "threads", message.threadId, userId)

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
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)

    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_user_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId),
      )
      .first()

    if (feedback) {
      await ctx.db.delete(feedback._id)
    }

    return null
  },
})

// Get feedback for a specific message by the current user
export const getUserFeedbackForMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("feedback"),
      _creationTime: v.number(),
      messageId: v.id("messages"),
      userId: v.id("users"),
      threadId: v.id("threads"),
      rating: feedbackRatingValidator,
      comment: commentValidator,
      reasons: feedbackReasonsValidator,
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthenticatedUserId(ctx)

      return await ctx.db
        .query("feedback")
        .withIndex("by_user_message", (q) =>
          q.eq("userId", userId).eq("messageId", args.messageId),
        )
        .first()
    } catch {
      return null
    }
  },
})

// Get all feedback for a thread (for analytics)
export const getThreadFeedback = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(
    v.object({
      _id: v.id("feedback"),
      _creationTime: v.number(),
      messageId: v.id("messages"),
      userId: v.id("users"),
      threadId: v.id("threads"),
      rating: feedbackRatingValidator,
      comment: commentValidator,
      reasons: feedbackReasonsValidator,
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthenticatedUserId(ctx)

      // Verify the user owns the thread
      await getWithOwnership(ctx.db, "threads", args.threadId, userId)

      return await ctx.db
        .query("feedback")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .collect()
    } catch {
      return []
    }
  },
})
