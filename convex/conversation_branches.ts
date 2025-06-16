import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { internal } from "./_generated/api.js"
import type { Id } from "./_generated/dataModel.js"
import { mutation, query } from "./_generated/server.js"

// Get all conversation branches for a thread
export const getConversationBranches = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(
    v.object({
      conversationBranchId: v.string(),
      branchPoint: v.optional(v.id("messages")),
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
        messageCount: number
      }
    >()

    for (const message of allMessages) {
      const conversationBranchId = message.conversationBranchId || "main"
      if (!branchGroups.has(conversationBranchId)) {
        branchGroups.set(conversationBranchId, {
          conversationBranchId,
          branchPoint: message.branchPoint,
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
    }))
  },
})

// Create a new conversation branch by retrying an assistant message
export const createConversationBranch = mutation({
  args: {
    threadId: v.id("threads"),
    assistantMessageId: v.id("messages"), // The assistant message to retry
  },
  returns: v.object({
    conversationBranchId: v.string(),
    branchPoint: v.id("messages"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    // Get the assistant message to retry
    const assistantMessage = await ctx.db.get(args.assistantMessageId)
    if (!assistantMessage || assistantMessage.messageType !== "assistant") {
      throw new Error("Assistant message not found")
    }

    // Verify thread access
    const thread = await ctx.db.get(assistantMessage.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or access denied")
    }

    // Find the user message that prompted this assistant response
    let userMessage = null
    if (assistantMessage.parentMessageId) {
      userMessage = await ctx.db.get(assistantMessage.parentMessageId)
    } else {
      // Find the previous user message in the conversation
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) =>
          q.eq("threadId", assistantMessage.threadId),
        )
        .filter((q) => q.lt(q.field("timestamp"), assistantMessage.timestamp))
        .order("desc")
        .take(10)

      userMessage = messages.find((msg) => msg.messageType === "user")
    }

    if (!userMessage) {
      throw new Error("Could not find user message to retry from")
    }

    // Set thread generation flag to prevent race conditions
    await ctx.db.patch(assistantMessage.threadId, {
      isGenerating: true,
    })

    // Create unique conversation branch ID with random suffix to prevent race conditions
    const randomSuffix = crypto.randomUUID().substring(0, 8)
    const conversationBranchId = `branch_${args.assistantMessageId}_${Date.now()}_${randomSuffix}`

    // The branch point is the user message that prompted the assistant response
    const branchPoint = userMessage._id

    console.log(
      `🔧 createConversationBranch: assistantMessageId=${args.assistantMessageId}, conversationBranchId=${conversationBranchId}, branchPoint=${branchPoint}`,
    )

    // Schedule AI response generation for the new conversation branch
    await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
      threadId: assistantMessage.threadId,
      userMessage: userMessage.body,
      modelId: assistantMessage.modelId || "gpt-4o-mini",
      conversationBranchId: conversationBranchId,
      branchPoint: branchPoint,
    })

    return {
      conversationBranchId,
      branchPoint,
    }
  },
})
