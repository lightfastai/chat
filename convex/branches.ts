import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { internal } from "./_generated/api.js"
import type { Id } from "./_generated/dataModel.js"
import { mutation, query } from "./_generated/server.js"

// No need for model ID validator in this file

// Get all conversation branches for a thread
export const getConversationBranches = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(
    v.object({
      conversationBranchId: v.string(),
      branchPoint: v.optional(v.id("messages")),
      branchFromMessageId: v.optional(v.id("messages")),
      messageCount: v.number(),
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

    // Get all messages to find conversation branches
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect()

    // Group by conversation branch
    const branchGroups = new Map<
      string,
      {
        conversationBranchId: string
        branchPoint: string | undefined
        branchFromMessageId: string | undefined
        messageCount: number
      }
    >()

    for (const message of allMessages) {
      const conversationBranchId = message.conversationBranchId || "main"
      if (!branchGroups.has(conversationBranchId)) {
        branchGroups.set(conversationBranchId, {
          conversationBranchId,
          branchPoint: message.branchPoint,
          branchFromMessageId: message.branchFromMessageId,
          messageCount: 0,
        })
      }
      branchGroups.get(conversationBranchId)!.messageCount++
    }

    return Array.from(branchGroups.values()).map((group) => ({
      ...group,
      branchPoint: group.branchPoint
        ? (group.branchPoint as Id<"messages">)
        : undefined,
      branchFromMessageId: group.branchFromMessageId
        ? (group.branchFromMessageId as Id<"messages">)
        : undefined,
    }))
  },
})

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
      .withIndex("by_branch_from", (q) =>
        q.eq("branchFromMessageId", args.messageId),
      )
      .collect()

    // Include the original message as sequence 0
    const allVariants = [originalMessage, ...variants]

    // Sort by branch sequence (treat undefined as 0)
    allVariants.sort(
      (a, b) => (a.branchSequence || 0) - (b.branchSequence || 0),
    )

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
      .withIndex("by_branch_from", (q) =>
        q.eq("branchFromMessageId", args.originalMessageId),
      )
      .collect()

    // Check branch limit (max 10 total including original)
    if (existingBranches.length >= 9) {
      throw new Error(
        "Maximum number of branches (10) reached for this message",
      )
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
      .withIndex("by_branch_from", (q) =>
        q.eq("branchFromMessageId", args.originalMessageId),
      )
      .collect()

    // Check branch limit (max 10 total including original)
    if (existingBranches.length >= 9) {
      throw new Error(
        "Maximum number of branches (10) reached for this message",
      )
    }

    // Find the user message that this assistant message was responding to
    let userMessage = null
    if (originalMessage.parentMessageId) {
      userMessage = await ctx.db.get(originalMessage.parentMessageId)
    } else {
      // Find the previous user message in the conversation
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) =>
          q.eq("threadId", originalMessage.threadId),
        )
        .filter((q) => q.lt(q.field("timestamp"), originalMessage.timestamp))
        .order("desc")
        .take(10)

      userMessage = messages.find((msg) => msg.messageType === "user")
    }

    if (!userMessage) {
      throw new Error("Could not find user message to retry from")
    }

    // Set thread generation flag to prevent race conditions
    await ctx.db.patch(originalMessage.threadId, {
      isGenerating: true,
    })

    // Create new branch and let generateAIResponse create the message
    const newBranchSequence = existingBranches.length + 1
    const branchId = `b${newBranchSequence}`

    // Create conversation branch ID for v0.dev-style branching
    // If the original message is already in a branch, stay in that branch
    // Otherwise, create a new branch for the first retry
    const conversationBranchId =
      originalMessage.conversationBranchId &&
      originalMessage.conversationBranchId !== "main"
        ? originalMessage.conversationBranchId // Stay in the existing branch
        : `branch_${args.originalMessageId}_${Date.now()}_${newBranchSequence}` // Create new branch for first retry with unique ID

    // Find the actual branch point (the user message that prompted the assistant response)
    // In conversation-level branching, we branch from the user message, not the assistant message
    let actualBranchPoint: Id<"messages">
    
    // If this is the first retry (original message is in main branch)
    if (!originalMessage.conversationBranchId || originalMessage.conversationBranchId === "main") {
      // The branch point is the user message that this assistant message was responding to
      actualBranchPoint = userMessage._id
    } else {
      // For subsequent retries, trace back to find the original branch point
      let currentMessage = originalMessage
      actualBranchPoint = userMessage._id // Default to current user message
      
      while (
        currentMessage.branchFromMessageId &&
        currentMessage.conversationBranchId !== "main"
      ) {
        const parentMessage = await ctx.db.get(currentMessage.branchFromMessageId)
        if (!parentMessage) break

        // If the parent is in the main branch, we found the original branch point
        if (
          !parentMessage.conversationBranchId ||
          parentMessage.conversationBranchId === "main"
        ) {
          // Get the user message that prompted this branch
          if (parentMessage.parentMessageId) {
            const parentUserMessage = await ctx.db.get(parentMessage.parentMessageId)
            if (parentUserMessage && parentUserMessage.messageType === "user") {
              actualBranchPoint = parentUserMessage._id
            }
          }
          break
        }

        currentMessage = parentMessage
      }
    }

    console.log(
      `🔧 createAssistantMessageBranch: originalMessageId=${args.originalMessageId}, branchSequence=${newBranchSequence}, branchId=${branchId}, conversationBranchId=${conversationBranchId}, actualBranchPoint=${actualBranchPoint}`,
    )

    // Schedule AI response generation for the new branch
    await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
      threadId: originalMessage.threadId,
      userMessage: userMessage.body,
      modelId: originalMessage.modelId || "gpt-4o-mini",
      branchId: branchId,
      branchFromMessageId: args.originalMessageId,
      branchSequence: newBranchSequence,
      conversationBranchId: conversationBranchId,
      branchPoint: actualBranchPoint,
    })

    // Return branch info (the actual message ID will be created by the scheduled action)
    return {
      branchMessageId: args.originalMessageId, // Return original as placeholder
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
        q.eq("threadId", args.threadId).eq("branchId", args.branchId),
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
