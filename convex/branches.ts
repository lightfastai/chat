import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server.js"

// No need for model ID validator in this file

// Get all branch variants for a specific message
export const getBranchVariants = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      threadId: v.id("threads"),
      body: v.string(),
      timestamp: v.number(),
      messageType: v.union(v.literal("user"), v.literal("assistant")),
      branchId: v.optional(v.string()),
      branchSequence: v.optional(v.number()),
      model: v.optional(v.string()),
      modelId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    // Get the original message
    const originalMessage = await ctx.db.get(args.messageId)
    if (!originalMessage) {
      return []
    }

    // Verify thread access
    const thread = await ctx.db.get(originalMessage.threadId)
    if (!thread || thread.userId !== userId) {
      return []
    }

    // Get all branch variants (including the original)
    const variants = await ctx.db
      .query("messages")
      .withIndex("by_branch_from", (q) => q.eq("branchFromMessageId", args.messageId))
      .collect()

    // Include the original message as sequence 0
    const allVariants = [originalMessage, ...variants]

    // Sort by branch sequence (treat undefined as 0)
    allVariants.sort((a, b) => (a.branchSequence || 0) - (b.branchSequence || 0))

    return allVariants.map((msg) => ({
      _id: msg._id,
      _creationTime: msg._creationTime,
      threadId: msg.threadId,
      body: msg.body,
      timestamp: msg.timestamp,
      messageType: msg.messageType,
      branchId: msg.branchId,
      branchSequence: msg.branchSequence,
      model: msg.model,
      modelId: msg.modelId,
    }))
  },
})

// Create a branch from a user message (edit functionality)
export const createUserMessageBranch = mutation({
  args: {
    threadId: v.id("threads"),
    originalMessageId: v.id("messages"),
    newContent: v.string(),
  },
  returns: v.object({
    branchMessageId: v.id("messages"),
    branchSequence: v.number(),
    totalBranches: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    // Get the original message
    const originalMessage = await ctx.db.get(args.originalMessageId)
    if (!originalMessage) {
      throw new Error("Original message not found")
    }

    // Verify thread access
    const thread = await ctx.db.get(originalMessage.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or access denied")
    }

    // Check if content is the same (no need to branch)
    if (originalMessage.body.trim() === args.newContent.trim()) {
      return {
        branchMessageId: originalMessage._id,
        branchSequence: originalMessage.branchSequence || 0,
        totalBranches: 1,
      }
    }

    // Count existing branches
    const existingBranches = await ctx.db
      .query("messages")
      .withIndex("by_branch_from", (q) => q.eq("branchFromMessageId", args.originalMessageId))
      .collect()

    // Check branch limit (max 10 total including original)
    if (existingBranches.length >= 9) {
      throw new Error("Maximum number of branches (10) reached for this message")
    }

    // Create new branch
    const newBranchSequence = existingBranches.length + 1
    const branchId = `b${newBranchSequence}`

    const branchMessageId = await ctx.db.insert("messages", {
      threadId: originalMessage.threadId,
      body: args.newContent,
      timestamp: Date.now(),
      messageType: "user",
      branchId: branchId,
      parentMessageId: originalMessage.parentMessageId,
      branchFromMessageId: args.originalMessageId,
      branchSequence: newBranchSequence,
    })

    return {
      branchMessageId,
      branchSequence: newBranchSequence,
      totalBranches: existingBranches.length + 2, // +1 for original, +1 for new branch
    }
  },
})

// Create a branch from an assistant message (retry functionality)
export const createAssistantMessageBranch = mutation({
  args: {
    threadId: v.id("threads"),
    originalMessageId: v.id("messages"),
  },
  returns: v.object({
    branchMessageId: v.id("messages"),
    branchSequence: v.number(),
    totalBranches: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    // Get the original message
    const originalMessage = await ctx.db.get(args.originalMessageId)
    if (!originalMessage || originalMessage.messageType !== "assistant") {
      throw new Error("Original assistant message not found")
    }

    // Verify thread access
    const thread = await ctx.db.get(originalMessage.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or access denied")
    }

    // Count existing branches
    const existingBranches = await ctx.db
      .query("messages")
      .withIndex("by_branch_from", (q) => q.eq("branchFromMessageId", args.originalMessageId))
      .collect()

    // Check branch limit (max 10 total including original)
    if (existingBranches.length >= 9) {
      throw new Error("Maximum number of branches (10) reached for this message")
    }

    // Create new branch with placeholder content (will be filled by AI generation)
    const newBranchSequence = existingBranches.length + 1
    const branchId = `b${newBranchSequence}`

    const branchMessageId = await ctx.db.insert("messages", {
      threadId: originalMessage.threadId,
      body: "", // Will be filled by streaming
      timestamp: Date.now(),
      messageType: "assistant",
      model: originalMessage.model,
      modelId: originalMessage.modelId,
      branchId: branchId,
      parentMessageId: originalMessage.parentMessageId,
      branchFromMessageId: args.originalMessageId,
      branchSequence: newBranchSequence,
      isStreaming: true,
      isComplete: false,
    })

    return {
      branchMessageId,
      branchSequence: newBranchSequence,
      totalBranches: existingBranches.length + 2, // +1 for original, +1 for new branch
    }
  },
})

// Get messages for a specific branch of a conversation
export const getMessagesForBranch = query({
  args: {
    threadId: v.id("threads"),
    branchId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      threadId: v.id("threads"),
      body: v.string(),
      timestamp: v.number(),
      messageType: v.union(v.literal("user"), v.literal("assistant")),
      branchId: v.optional(v.string()),
      branchSequence: v.optional(v.number()),
      parentMessageId: v.optional(v.id("messages")),
      branchFromMessageId: v.optional(v.id("messages")),
      model: v.optional(v.string()),
      modelId: v.optional(v.string()),
      isStreaming: v.optional(v.boolean()),
      isComplete: v.optional(v.boolean()),
      streamId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    // Verify thread access
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return []
    }

    // Get all messages for this branch
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_branch", (q) => 
        q.eq("threadId", args.threadId).eq("branchId", args.branchId)
      )
      .order("asc")
      .collect()

    return messages.map((msg) => ({
      _id: msg._id,
      _creationTime: msg._creationTime,
      threadId: msg.threadId,
      body: msg.body,
      timestamp: msg.timestamp,
      messageType: msg.messageType,
      branchId: msg.branchId,
      branchSequence: msg.branchSequence,
      parentMessageId: msg.parentMessageId,
      branchFromMessageId: msg.branchFromMessageId,
      model: msg.model,
      modelId: msg.modelId,
      isStreaming: msg.isStreaming,
      isComplete: msg.isComplete,
      streamId: msg.streamId,
    }))
  },
})