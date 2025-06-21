import { v } from "convex/values"
import {
  type ModelId,
  getProviderFromModelId,
} from "../../src/lib/ai/schemas.js"
import { internal } from "../_generated/api.js"
import { internalMutation, mutation } from "../_generated/server.js"
import { getAuthenticatedUserId } from "../lib/auth.js"
import { getOrThrow, getWithOwnership } from "../lib/database.js"
import { throwConflictError } from "../lib/errors.js"
import {
  chunkIdValidator,
  modelIdValidator,
  modelProviderValidator,
  streamIdValidator,
  tokenUsageValidator,
} from "../validators.js"
import { generateStreamId, updateThreadUsage } from "./helpers.js"
import type { MessageUsageUpdate } from "./types.js"

export const send = mutation({
  args: {
    threadId: v.id("threads"),
    body: v.string(),
    modelId: v.optional(modelIdValidator), // Use the validated modelId
    attachments: v.optional(v.array(v.id("files"))), // Add attachments support
    webSearchEnabled: v.optional(v.boolean()),
  },
  returns: v.object({
    messageId: v.id("messages"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)

    // Verify the user owns this thread and check generation status
    const thread = await getWithOwnership(
      ctx.db,
      "threads",
      args.threadId,
      userId,
    )

    // Prevent new messages while AI is generating
    if (thread.isGenerating) {
      throwConflictError(
        "Please wait for the current AI response to complete before sending another message",
      )
    }

    // CRITICAL FIX: Set generation flag IMMEDIATELY to prevent race conditions
    await ctx.db.patch(args.threadId, {
      isGenerating: true,
      lastMessageAt: Date.now(),
    })

    // Use default model if none provided
    const modelId = args.modelId || "gpt-4o-mini"

    // Derive provider from modelId (type-safe)
    const provider = getProviderFromModelId(modelId as ModelId)

    // Insert user message after setting generation flag
    const messageId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      body: args.body,
      timestamp: Date.now(),
      messageType: "user",
      model: provider,
      modelId: modelId,
      attachments: args.attachments,
    })

    // Schedule AI response using the modelId
    await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
      threadId: args.threadId,
      userMessage: args.body,
      modelId: modelId,
      attachments: args.attachments,
      webSearchEnabled: args.webSearchEnabled,
    })

    // Check if this is the first user message in the thread (for title generation)
    const userMessages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.eq(q.field("messageType"), "user"))
      .collect()

    // If this is the first user message, schedule title generation
    if (userMessages.length === 1) {
      await ctx.scheduler.runAfter(100, internal.titles.generateTitle, {
        threadId: args.threadId,
        userMessage: args.body,
      })
    }

    return { messageId }
  },
})

// Combined mutation for creating thread + sending first message (optimistic flow)
export const createThreadAndSend = mutation({
  args: {
    title: v.string(),
    clientId: v.string(),
    body: v.string(),
    modelId: v.optional(modelIdValidator),
    attachments: v.optional(v.array(v.id("files"))), // Add attachments support
    webSearchEnabled: v.optional(v.boolean()),
  },
  returns: v.object({
    threadId: v.id("threads"),
    userMessageId: v.id("messages"),
    assistantMessageId: v.id("messages"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx)

    // Check for collision if clientId is provided (extremely rare with nanoid)
    const existing = await ctx.db
      .query("threads")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .first()

    if (existing) {
      throwConflictError(`Thread with clientId ${args.clientId} already exists`)
    }

    // Use default model if none provided
    const modelId = args.modelId || "gpt-4o-mini"
    const provider = getProviderFromModelId(modelId as ModelId)

    // Create thread atomically with generation flag set
    const now = Date.now()
    const threadId = await ctx.db.insert("threads", {
      clientId: args.clientId,
      title: args.title,
      userId: userId,
      createdAt: now,
      lastMessageAt: now,
      isTitleGenerating: true,
      isGenerating: true, // Set immediately to prevent race conditions
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

    // Insert user message
    const userMessageId = await ctx.db.insert("messages", {
      threadId,
      body: args.body,
      timestamp: now,
      messageType: "user",
      model: provider,
      modelId: modelId,
      attachments: args.attachments,
    })

    // Generate unique stream ID for assistant message
    const streamId = generateStreamId()

    // Create assistant message placeholder immediately
    const assistantMessageId = await ctx.db.insert("messages", {
      threadId,
      body: "", // Will be updated as chunks arrive
      timestamp: now + 1, // Ensure it comes after user message
      messageType: "assistant",
      model: provider,
      modelId: modelId,
      isStreaming: true,
      streamId: streamId,
      isComplete: false,
      thinkingStartedAt: now,
      streamChunks: [], // Initialize empty chunks array
      streamVersion: 0, // Initialize version counter
      lastChunkId: undefined, // Initialize last chunk ID
    })

    // Schedule AI response with the pre-created message ID
    await ctx.scheduler.runAfter(
      0,
      internal.messages.generateAIResponseWithMessage,
      {
        threadId,
        userMessage: args.body,
        modelId: modelId,
        attachments: args.attachments,
        webSearchEnabled: args.webSearchEnabled,
        messageId: assistantMessageId,
        streamId: streamId,
      },
    )

    // Schedule title generation (this is the first message)
    await ctx.scheduler.runAfter(100, internal.titles.generateTitle, {
      threadId,
      userMessage: args.body,
    })

    return {
      threadId,
      userMessageId,
      assistantMessageId,
    }
  },
})

// Internal mutation to create initial streaming message
export const createStreamingMessage = internalMutation({
  args: {
    threadId: v.id("threads"),
    streamId: streamIdValidator,
    provider: modelProviderValidator,
    modelId: modelIdValidator,
    usedUserApiKey: v.optional(v.boolean()),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert("messages", {
      threadId: args.threadId,
      body: "", // Will be updated as chunks arrive
      timestamp: now,
      messageType: "assistant",
      model: args.provider,
      isStreaming: true,
      streamId: args.streamId,
      isComplete: false,
      thinkingStartedAt: now,
      streamChunks: [], // Initialize empty chunks array
      streamVersion: 0, // Initialize version counter
      lastChunkId: undefined, // Initialize last chunk ID
      modelId: args.modelId,
      usedUserApiKey: args.usedUserApiKey,
    })
  },
})

// Internal mutation to append a chunk and update the message
export const appendStreamChunk = internalMutation({
  args: {
    messageId: v.id("messages"),
    chunk: v.string(),
    chunkId: chunkIdValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)
    if (!message) return null

    const currentChunks = message.streamChunks || []
    const sequence = currentChunks.length // Use array length as sequence number

    const newChunk = {
      chunkId: args.chunkId,
      content: args.chunk,
      timestamp: Date.now(),
      sequence: sequence, // Add sequence for ordering
    }

    // Check for duplicate chunks (race condition protection)
    if (currentChunks.some((chunk) => chunk.chunkId === args.chunkId)) {
      console.log(`Duplicate chunk detected: ${args.chunkId}`)
      return null // Skip duplicate
    }

    // Append chunk to array and update body
    const updatedChunks = [...currentChunks, newChunk]
    const updatedBody = message.body + args.chunk

    await ctx.db.patch(args.messageId, {
      body: updatedBody,
      streamChunks: updatedChunks,
      lastChunkId: args.chunkId,
      streamVersion: (message.streamVersion || 0) + 1,
    })

    return null
  },
})

// Internal mutation to update streaming message content
export const updateStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // For backward compatibility, we'll update the body directly
    // but in the new streaming logic, use appendStreamChunk instead
    await ctx.db.patch(args.messageId, {
      body: args.content,
      streamVersion:
        ((await ctx.db.get(args.messageId))?.streamVersion || 0) + 1,
    })

    return null
  },
})

// Internal mutation to update message API key status
export const updateMessageApiKeyStatus = internalMutation({
  args: {
    messageId: v.id("messages"),
    usedUserApiKey: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      usedUserApiKey: args.usedUserApiKey,
    })
    return null
  },
})

// Internal mutation to update thread usage
export const updateThreadUsageMutation = internalMutation({
  args: {
    threadId: v.id("threads"),
    usage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
      reasoningTokens: v.number(),
      cachedTokens: v.number(),
      modelId: modelIdValidator,
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { threadId, usage } = args
    const messageUsage: MessageUsageUpdate = {
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      reasoningTokens: usage.reasoningTokens,
      cachedInputTokens: usage.cachedTokens,
    }

    await updateThreadUsage(ctx, threadId, usage.modelId, messageUsage)
    return null
  },
})

// Internal mutation to update message with error
export const updateMessageError = internalMutation({
  args: {
    messageId: v.id("messages"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      body: args.errorMessage,
      isStreaming: false,
      isComplete: true,
      thinkingCompletedAt: Date.now(),
    })
    return null
  },
})

// Internal mutation to mark streaming as complete (original version)
export const completeStreamingMessageLegacy = internalMutation({
  args: {
    messageId: v.id("messages"),
    usage: tokenUsageValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the message exists
    await getOrThrow(ctx.db, "messages", args.messageId)

    // Update the message with completion status and usage
    await ctx.db.patch(args.messageId, {
      isStreaming: false,
      isComplete: true,
      thinkingCompletedAt: Date.now(),
      usage: args.usage,
    })

    // Thread usage has already been updated via updateUsage during streaming
    // No need to update again here to avoid double counting

    return null
  },
})

// Internal mutation to mark streaming as complete and update thread usage
export const completeStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    streamId: streamIdValidator,
    fullText: v.string(),
    usage: tokenUsageValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the message exists
    await getOrThrow(ctx.db, "messages", args.messageId)

    // Update the message with completion status and full text
    await ctx.db.patch(args.messageId, {
      body: args.fullText,
      isStreaming: false,
      isComplete: true,
      thinkingCompletedAt: Date.now(),
      usage: args.usage,
    })

    // Thread usage has already been updated via updateUsage during streaming
    // No need to update again here to avoid double counting

    return null
  },
})

// Internal mutation to create error message
export const createErrorMessage = internalMutation({
  args: {
    threadId: v.id("threads"),
    streamId: streamIdValidator,
    provider: modelProviderValidator,
    modelId: v.optional(modelIdValidator),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now()
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      body: args.errorMessage,
      timestamp: now,
      messageType: "assistant",
      model: args.provider,
      modelId: args.modelId,
      isStreaming: false,
      streamId: args.streamId,
      isComplete: true,
      thinkingStartedAt: now,
      thinkingCompletedAt: now,
    })

    return null
  },
})

// Internal mutation to update thinking state
export const updateThinkingState = internalMutation({
  args: {
    messageId: v.id("messages"),
    isThinking: v.boolean(),
    hasThinkingContent: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      isThinking: args.isThinking,
      hasThinkingContent: args.hasThinkingContent,
    })
    return null
  },
})

// Internal mutation to update thinking content
export const updateThinkingContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    thinkingContent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      thinkingContent: args.thinkingContent,
    })
    return null
  },
})

// Internal mutation to clear the generation flag
export const clearGenerationFlag = internalMutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, {
      isGenerating: false,
    })
  },
})
