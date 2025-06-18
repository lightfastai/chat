import { anthropic, createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI, openai } from "@ai-sdk/openai"
import { getAuthUserId } from "@convex-dev/auth/server"
import { type CoreMessage, streamText, tool } from "ai"
import { v } from "convex/values"
import Exa, {
  type RegularSearchOptions,
  type ContentsOptions,
  type SearchResult,
} from "exa-js"
import { z } from "zod"
import { internal } from "./_generated/api.js"
import type { Doc, Id } from "./_generated/dataModel.js"
import {
  type ActionCtx,
  type MutationCtx,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js"

import { getModelById } from "../src/lib/ai/models.js"
// Import shared types and utilities
import {
  type ModelId,
  getActualModelName,
  getProviderFromModelId,
  isThinkingMode,
} from "../src/lib/ai/types.js"
import { env } from "./env.js"
import {
  branchInfoValidator,
  chunkIdValidator,
  clientIdValidator,
  messageTypeValidator,
  modelIdValidator,
  modelProviderValidator,
  shareIdValidator,
  shareSettingsValidator,
  streamChunkValidator,
  streamIdValidator,
  threadUsageValidator,
  tokenUsageValidator,
} from "./validators.js"

// Create web search tool using proper AI SDK v5 pattern
function createWebSearchTool() {
  return tool({
    description:
      "Search the web for current information, news, and real-time data. Use this proactively when you need up-to-date information beyond your knowledge cutoff. After receiving search results, you must immediately analyze and explain the findings without waiting for additional prompting.",
    parameters: z.object({
      query: z
        .string()
        .describe("The search query to find relevant web results"),
    }),
    execute: async ({ query }) => {
      console.log(`Executing web search for: "${query}"`)

      const exaApiKey = env.EXA_API_KEY

      try {
        const exa = new Exa(exaApiKey)
        const numResults = 5
        const searchOptions: RegularSearchOptions & ContentsOptions = {
          numResults,
          text: {
            maxCharacters: 1500, // Increased for better context
            includeHtmlTags: false,
          },
          highlights: {
            numSentences: 4, // More highlights for better understanding
            highlightsPerUrl: 3,
          },
        }

        const response = await exa.search(query, searchOptions)

        const results = response.results.map((result) => ({
          id: result.id,
          url: result.url,
          title: result.title || "",
          text: result.text,
          highlights: (
            result as SearchResult<ContentsOptions> & { highlights?: string[] }
          ).highlights,
          publishedDate: result.publishedDate,
          author: result.author,
          score: result.score,
        }))

        console.log(`Web search found ${results.length} results`)

        // Return structured data that helps the AI understand and explain
        return {
          success: true,
          query,
          searchIntent: `Web search for: "${query}"`,
          resultCount: results.length,
          results: results.slice(0, 3).map((r, idx) => ({
            ...r,
            relevanceRank: idx + 1,
            summary: r.text
              ? `${r.text.slice(0, 200)}...`
              : "No preview available",
          })),
          searchMetadata: {
            timestamp: new Date().toISOString(),
            autoprompt: response.autopromptString,
          },
        }
      } catch (error) {
        console.error("Web search error:", error)
        return {
          success: false,
          query,
          error: error instanceof Error ? error.message : "Unknown error",
          results: [],
          resultCount: 0,
        }
      }
    },
  })
}

export const listByClientId = query({
  args: {
    clientId: clientIdValidator,
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      threadId: v.id("threads"),
      body: v.string(),
      timestamp: v.number(),
      messageType: messageTypeValidator,
      model: v.optional(modelProviderValidator),
      modelId: v.optional(v.string()),
      isStreaming: v.optional(v.boolean()),
      streamId: v.optional(streamIdValidator),
      isComplete: v.optional(v.boolean()),
      thinkingStartedAt: v.optional(v.number()),
      thinkingCompletedAt: v.optional(v.number()),
      attachments: v.optional(v.array(v.id("files"))),
      thinkingContent: v.optional(v.string()),
      isThinking: v.optional(v.boolean()),
      hasThinkingContent: v.optional(v.boolean()),
      usedUserApiKey: v.optional(v.boolean()),
      usage: tokenUsageValidator,
      lastChunkId: v.optional(chunkIdValidator),
      streamChunks: v.optional(v.array(streamChunkValidator)),
      streamVersion: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    // First get the thread by clientId
    const thread = await ctx.db
      .query("threads")
      .withIndex("by_user_client", (q) =>
        q.eq("userId", userId).eq("clientId", args.clientId),
      )
      .first()

    if (!thread) {
      return []
    }

    // Then get messages for this thread
    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
      .order("desc")
      .take(50)
  },
})

export const list = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      threadId: v.id("threads"),
      body: v.string(),
      timestamp: v.number(),
      messageType: messageTypeValidator,
      model: v.optional(modelProviderValidator),
      modelId: v.optional(v.string()), // Keep as string for flexibility but validate in handler
      isStreaming: v.optional(v.boolean()),
      streamId: v.optional(streamIdValidator),
      isComplete: v.optional(v.boolean()),
      thinkingStartedAt: v.optional(v.number()),
      thinkingCompletedAt: v.optional(v.number()),
      attachments: v.optional(v.array(v.id("files"))),
      thinkingContent: v.optional(v.string()),
      isThinking: v.optional(v.boolean()),
      hasThinkingContent: v.optional(v.boolean()),
      usedUserApiKey: v.optional(v.boolean()),
      usage: tokenUsageValidator,
      lastChunkId: v.optional(chunkIdValidator),
      streamChunks: v.optional(v.array(streamChunkValidator)),
      streamVersion: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    // Verify the user owns this thread
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return []
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(50)
  },
})

export const send = mutation({
  args: {
    threadId: v.id("threads"),
    body: v.string(),
    modelId: v.optional(modelIdValidator), // Use the validated modelId
    attachments: v.optional(v.array(v.id("files"))), // Add attachments support
    webSearchEnabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    // Verify the user owns this thread
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error("Thread not found or access denied")
    }

    // Prevent new messages while AI is generating
    if (thread.isGenerating) {
      throw new Error(
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
    await ctx.db.insert("messages", {
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

    return null
  },
})

// Combined mutation for creating thread + sending first message (optimistic flow)
export const createThreadAndSend = mutation({
  args: {
    title: v.string(),
    clientId: clientIdValidator,
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
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    // Check for collision if clientId is provided (extremely rare with nanoid)
    const existing = await ctx.db
      .query("threads")
      .withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
      .first()

    if (existing) {
      throw new Error(`Thread with clientId ${args.clientId} already exists`)
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
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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

// Helper to get file URLs in an internal context
async function getFileWithUrl(ctx: ActionCtx, fileId: Id<"files">) {
  // Use internal query to get file with URL
  const file = await ctx.runQuery(internal.files.getFileWithUrl, { fileId })
  return file
}

// Type for multimodal content parts based on AI SDK v5
type TextPart = { type: "text"; text: string }
type ImagePart = { type: "image"; image: string | URL }
type FilePart = {
  type: "file"
  data: string | URL
  mediaType: string
}

type MultimodalContent = string | Array<TextPart | ImagePart | FilePart>

// Helper function to build message content with attachments
async function buildMessageContent(
  ctx: ActionCtx,
  text: string,
  attachmentIds?: Id<"files">[],
  provider?: "openai" | "anthropic" | "openrouter",
  modelId?: string,
): Promise<MultimodalContent> {
  // If no attachments, return simple text content
  if (!attachmentIds || attachmentIds.length === 0) {
    return text
  }

  // Get model configuration to check capabilities
  const modelConfig = modelId ? getModelById(modelId) : null
  const hasVisionSupport = modelConfig?.features.vision ?? false
  const hasPdfSupport = modelConfig?.features.pdfSupport ?? false

  // Build content array with text and files
  const content = [{ type: "text" as const, text }] as Array<
    TextPart | ImagePart | FilePart
  >

  // Fetch each file with its URL
  for (const fileId of attachmentIds) {
    const file = await getFileWithUrl(ctx, fileId)
    if (!file || !file.url) continue

    // Handle images
    if (file.fileType.startsWith("image/")) {
      if (!hasVisionSupport) {
        // Model doesn't support vision
        if (content[0] && "text" in content[0]) {
          content[0].text += `\n\n[Attached image: ${file.fileName}]\n⚠️ Note: ${modelConfig?.displayName || "This model"} cannot view images. Please switch to GPT-4o, GPT-4o Mini, or any Claude model to analyze this image.`
        }
      } else {
        // Model supports vision - all models use URLs (no base64 needed)
        content.push({
          type: "image" as const,
          image: file.url,
        })
      }
    }
    // Handle PDFs
    else if (file.fileType === "application/pdf") {
      if (hasPdfSupport && provider === "anthropic") {
        // Claude supports PDFs as file type
        content.push({
          type: "file" as const,
          data: file.url,
          mediaType: "application/pdf",
        })
      } else {
        // PDF not supported - add as text description
        const description = `\n[Attached PDF: ${file.fileName} (${(file.fileSize / 1024).toFixed(1)}KB)] - Note: PDF content analysis requires Claude models.`
        content.push({
          type: "text" as const,
          text: description,
        })
      }
    }
    // For other file types, add as text description
    else {
      const description = `\n[Attached file: ${file.fileName} (${file.fileType}, ${(file.fileSize / 1024).toFixed(1)}KB)]`

      if (content[0] && "text" in content[0]) {
        content[0].text += description
      }
    }
  }

  return content
}

// New action that uses pre-created message ID
export const generateAIResponseWithMessage = internalAction({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
    modelId: modelIdValidator,
    attachments: v.optional(v.array(v.id("files"))),
    webSearchEnabled: v.optional(v.boolean()),
    messageId: v.id("messages"), // Pre-created message ID
    streamId: streamIdValidator, // Pre-generated stream ID
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Since this is called from createThreadAndSend, we know the thread exists
      // We just need to get the userId for API key retrieval
      const thread = await ctx.runQuery(internal.messages.getThreadById, {
        threadId: args.threadId,
      })
      if (!thread) {
        throw new Error("Thread not found")
      }

      // Derive provider and other settings from modelId
      const provider = getProviderFromModelId(args.modelId as ModelId)
      const actualModelName = getActualModelName(args.modelId as ModelId)

      // Get user's API keys if available
      const userApiKeys = await ctx.runMutation(
        internal.userSettings.getDecryptedApiKeys,
        { userId: thread.userId },
      )

      // Determine if user's API key will be used
      const willUseUserApiKey =
        (provider === "anthropic" && userApiKeys && userApiKeys.anthropic) ||
        (provider === "openai" && userApiKeys && userApiKeys.openai) ||
        (provider === "openrouter" && userApiKeys && userApiKeys.openrouter)

      // Update the pre-created message with API key status
      await ctx.runMutation(internal.messages.updateMessageApiKeyStatus, {
        messageId: args.messageId,
        usedUserApiKey: !!willUseUserApiKey,
      })

      // Get recent conversation context
      const recentMessages = await ctx.runQuery(
        internal.messages.getRecentContext,
        { threadId: args.threadId },
      )

      // Prepare system prompt based on model capabilities
      let systemPrompt =
        "You are a helpful AI assistant in a chat conversation. Be concise and friendly."

      // Check model capabilities
      const modelConfig = getModelById(args.modelId)
      const hasVisionSupport = modelConfig?.features.vision ?? false
      const hasPdfSupport = modelConfig?.features.pdfSupport ?? false

      if (hasVisionSupport) {
        if (hasPdfSupport) {
          // Claude models with both vision and PDF support
          systemPrompt +=
            " You can view and analyze images (JPEG, PNG, GIF, WebP) and PDF documents directly. For other file types, you'll receive a text description. When users ask about an attached file, provide detailed analysis of what you can see."
        } else {
          // GPT-4 models with vision but no PDF support
          systemPrompt +=
            " You can view and analyze images (JPEG, PNG, GIF, WebP) directly. For PDFs and other file types, you'll receive a text description. When asked about a PDF, politely explain that you can see it's attached but cannot analyze its contents - suggest using Claude models for PDF analysis. For images, provide detailed analysis of what you can see."
        }
      } else {
        // Models without vision support (e.g., GPT-3.5 Turbo)
        systemPrompt += ` IMPORTANT: You cannot view images or files directly with ${modelConfig?.displayName || "this model"}. When users share files and ask about them, you must clearly state: 'I can see you've uploaded [filename], but I'm unable to view or analyze images with ${modelConfig?.displayName || "this model"}. To analyze images or documents, please switch to GPT-4o, GPT-4o Mini, or any Claude model using the model selector below the input box.' Be helpful by acknowledging what files they've shared based on the descriptions you receive.`
      }

      // Prepare messages for AI SDK v5 with multimodal support
      const messages: CoreMessage[] = [
        {
          role: "system",
          content: systemPrompt,
        },
      ]

      // Build conversation history with attachments
      for (let i = 0; i < recentMessages.length; i++) {
        const msg = recentMessages[i]
        const isLastUserMessage =
          i === recentMessages.length - 1 && msg.messageType === "user"

        // For the last user message, include the current attachments
        const attachmentsToUse =
          isLastUserMessage && args.attachments
            ? args.attachments
            : msg.attachments

        // Build message content with attachments
        const content = await buildMessageContent(
          ctx,
          msg.body,
          attachmentsToUse,
          provider,
          args.modelId,
        )

        messages.push({
          role: msg.messageType === "user" ? "user" : "assistant",
          content,
        } as CoreMessage)
      }

      // Choose the appropriate model using user's API key if available, otherwise fall back to global
      const ai =
        provider === "anthropic"
          ? userApiKeys?.anthropic
            ? createAnthropic({ apiKey: userApiKeys.anthropic })
            : anthropic
          : provider === "openai"
            ? userApiKeys?.openai
              ? createOpenAI({ apiKey: userApiKeys.openai })
              : openai
            : provider === "openrouter"
              ? userApiKeys?.openrouter
                ? createOpenAI({
                    apiKey: userApiKeys.openrouter,
                    baseURL: "https://openrouter.ai/api/v1",
                    headers: {
                      "HTTP-Referer": env.SITE_URL || "http://localhost:3000",
                      "X-Title": "Lightfast Chat",
                    },
                  })
                : createOpenAI({
                    apiKey: env.OPENROUTER_API_KEY,
                    baseURL: "https://openrouter.ai/api/v1",
                    headers: {
                      "HTTP-Referer": env.SITE_URL || "http://localhost:3000",
                      "X-Title": "Lightfast Chat",
                    },
                  })
              : (() => {
                  throw new Error(`Unsupported provider: ${provider}`)
                })()

      // Update token usage function
      const updateUsage = async (usage: {
        promptTokens?: number
        completionTokens?: number
        totalTokens?: number
        completionTokensDetails?: { reasoningTokens?: number }
        promptTokensDetails?: { cachedTokens?: number }
      }) => {
        if (usage) {
          await ctx.runMutation(internal.messages.updateThreadUsageMutation, {
            threadId: args.threadId,
            usage: {
              promptTokens: usage.promptTokens || 0,
              completionTokens: usage.completionTokens || 0,
              totalTokens: usage.totalTokens || 0,
              reasoningTokens:
                usage.completionTokensDetails?.reasoningTokens || 0,
              cachedTokens: usage.promptTokensDetails?.cachedTokens || 0,
              modelId: args.modelId,
            },
          })
        }
      }

      // Prepare generation options
      const generationOptions: Parameters<typeof streamText>[0] = {
        model: ai(actualModelName),
        messages: messages,
        onFinish: async (event) => {
          await updateUsage(event.usage)
        },
      }

      // Add web search tool if enabled
      if (args.webSearchEnabled) {
        generationOptions.tools = {
          web_search: createWebSearchTool(),
        }
      }

      // Use the AI SDK v5 streamText
      const result = streamText(generationOptions)

      let fullText = ""
      let hasContent = false
      let toolCallsInProgress = 0

      // Process the stream
      for await (const chunk of result.textStream) {
        if (chunk) {
          fullText += chunk
          hasContent = true
          const chunkId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

          await ctx.runMutation(internal.messages.appendStreamChunk, {
            messageId: args.messageId,
            chunk,
            chunkId,
          })
        }
      }

      // Process tool calls if web search is enabled
      if (args.webSearchEnabled) {
        for await (const streamPart of result.fullStream) {
          if (streamPart.type === "tool-call") {
            toolCallsInProgress++
          }

          if (streamPart.type === "tool-result") {
            // Tool results are handled by the AI SDK and included in the response
            // We don't need to store them separately
          }
        }
      }

      // Get final usage with optional chaining
      const finalUsage = await result.usage
      if (finalUsage) {
        await updateUsage(finalUsage)
      }

      // If we have streamed content, mark the message as complete
      if (hasContent) {
        await ctx.runMutation(internal.messages.completeStreamingMessage, {
          messageId: args.messageId,
          streamId: args.streamId,
          fullText,
        })
      }

      // Clear the generation flag on success
      await ctx.runMutation(internal.messages.clearGenerationFlag, {
        threadId: args.threadId,
      })
    } catch (error) {
      console.error("Error in generateAIResponseWithMessage:", error)

      // Try to create error message
      try {
        // Update the existing message to show error
        await ctx.runMutation(internal.messages.updateMessageError, {
          messageId: args.messageId,
          errorMessage: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}. Please check your API keys.`,
        })
      } catch (errorHandlingError) {
        console.error("Error during error handling:", errorHandlingError)
      } finally {
        // CRITICAL: Always clear generation flag, even if error handling fails
        try {
          await ctx.runMutation(internal.messages.clearGenerationFlag, {
            threadId: args.threadId,
          })
        } catch (flagClearError) {
          console.error(
            "CRITICAL: Failed to clear generation flag:",
            flagClearError,
          )
          // This is a critical error that could leave the thread in a locked state
        }
      }
    }

    return null
  },
})

// Internal action to generate AI response using AI SDK v5
export const generateAIResponse = internalAction({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
    modelId: modelIdValidator, // Use validated modelId
    attachments: v.optional(v.array(v.id("files"))),
    webSearchEnabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let messageId: Id<"messages"> | null = null
    try {
      // Get thread and user information
      const thread = await ctx.runQuery(internal.messages.getThreadById, {
        threadId: args.threadId,
      })
      if (!thread) {
        throw new Error("Thread not found")
      }

      // Derive provider and other settings from modelId
      const provider = getProviderFromModelId(args.modelId as ModelId)
      const actualModelName = getActualModelName(args.modelId as ModelId)
      const isThinking = isThinkingMode(args.modelId as ModelId)

      // Get user's API keys if available
      const userApiKeys = await ctx.runMutation(
        internal.userSettings.getDecryptedApiKeys,
        { userId: thread.userId },
      )

      // Generate unique stream ID
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Determine if user's API key will be used
      const willUseUserApiKey =
        (provider === "anthropic" && userApiKeys && userApiKeys.anthropic) ||
        (provider === "openai" && userApiKeys && userApiKeys.openai) ||
        (provider === "openrouter" && userApiKeys && userApiKeys.openrouter)

      // Create initial AI message placeholder
      messageId = await ctx.runMutation(
        internal.messages.createStreamingMessage,
        {
          threadId: args.threadId,
          streamId,
          provider,
          modelId: args.modelId,
          usedUserApiKey: !!willUseUserApiKey,
        },
      )

      // Get recent conversation context
      const recentMessages = await ctx.runQuery(
        internal.messages.getRecentContext,
        { threadId: args.threadId },
      )

      // Prepare system prompt based on model capabilities
      let systemPrompt =
        "You are a helpful AI assistant in a chat conversation. Be concise and friendly."

      // Check model capabilities
      const modelConfig = getModelById(args.modelId)
      const hasVisionSupport = modelConfig?.features.vision ?? false
      const hasPdfSupport = modelConfig?.features.pdfSupport ?? false

      if (hasVisionSupport) {
        if (hasPdfSupport) {
          // Claude models with both vision and PDF support
          systemPrompt +=
            " You can view and analyze images (JPEG, PNG, GIF, WebP) and PDF documents directly. For other file types, you'll receive a text description. When users ask about an attached file, provide detailed analysis of what you can see."
        } else {
          // GPT-4 models with vision but no PDF support
          systemPrompt +=
            " You can view and analyze images (JPEG, PNG, GIF, WebP) directly. For PDFs and other file types, you'll receive a text description. When asked about a PDF, politely explain that you can see it's attached but cannot analyze its contents - suggest using Claude models for PDF analysis. For images, provide detailed analysis of what you can see."
        }
      } else {
        // Models without vision support (e.g., GPT-3.5 Turbo)
        systemPrompt += ` IMPORTANT: You cannot view images or files directly with ${modelConfig?.displayName || "this model"}. When users share files and ask about them, you must clearly state: 'I can see you've uploaded [filename], but I'm unable to view or analyze images with ${modelConfig?.displayName || "this model"}. To analyze images or documents, please switch to GPT-4o, GPT-4o Mini, or any Claude model using the model selector below the input box.' Be helpful by acknowledging what files they've shared based on the descriptions you receive.`
      }

      // Prepare messages for AI SDK v5 with multimodal support
      const messages: CoreMessage[] = [
        {
          role: "system",
          content: systemPrompt,
        },
      ]

      // Build conversation history with attachments
      for (let i = 0; i < recentMessages.length; i++) {
        const msg = recentMessages[i]
        const isLastUserMessage =
          i === recentMessages.length - 1 && msg.messageType === "user"

        // For the last user message, include the current attachments
        const attachmentsToUse =
          isLastUserMessage && args.attachments
            ? args.attachments
            : msg.attachments

        // Build message content with attachments
        const content = await buildMessageContent(
          ctx,
          msg.body,
          attachmentsToUse,
          provider,
          args.modelId,
        )

        messages.push({
          role: msg.messageType === "user" ? "user" : "assistant",
          content,
        } as CoreMessage)
      }

      console.log(
        `Attempting to call ${provider} with model ID ${args.modelId} and ${messages.length} messages`,
      )
      console.log(`Schema fix timestamp: ${Date.now()}`)
      console.log(`Web search enabled: ${args.webSearchEnabled}`)

      // Choose the appropriate model using user's API key if available, otherwise fall back to global
      const selectedModel =
        provider === "anthropic"
          ? userApiKeys?.anthropic
            ? createAnthropic({ apiKey: userApiKeys.anthropic })(
                actualModelName,
              )
            : anthropic(actualModelName)
          : provider === "openai"
            ? userApiKeys?.openai
              ? createOpenAI({ apiKey: userApiKeys.openai })(actualModelName)
              : openai(actualModelName)
            : provider === "openrouter"
              ? userApiKeys?.openrouter
                ? createOpenAI({
                    apiKey: userApiKeys.openrouter,
                    baseURL: "https://openrouter.ai/api/v1",
                    headers: {
                      "HTTP-Referer": env.SITE_URL || "http://localhost:3000",
                      "X-Title": "Lightfast Chat",
                    },
                  })(actualModelName)
                : createOpenAI({
                    apiKey: env.OPENROUTER_API_KEY,
                    baseURL: "https://openrouter.ai/api/v1",
                    headers: {
                      "HTTP-Referer": env.SITE_URL || "http://localhost:3000",
                      "X-Title": "Lightfast Chat",
                    },
                  })(actualModelName)
              : (() => {
                  throw new Error(`Unsupported provider: ${provider}`)
                })()

      // Stream response using AI SDK v5 with full stream for reasoning support
      const streamOptions: Parameters<typeof streamText>[0] = {
        model: selectedModel,
        messages: messages,
        temperature: 0.7,
      }

      // Only enable web search tools if explicitly requested
      if (args.webSearchEnabled) {
        console.log(`Enabling web search tools for ${provider}`)

        // Check if EXA_API_KEY is available
        // Type-safe env check already handled by env validation

        console.log("Creating web_search tool...")
        streamOptions.tools = {
          web_search: createWebSearchTool(),
        }

        // Enhanced agentic system prompt for web search
        systemPrompt += `\n\nYou have web search capabilities. You should proactively search for information when needed to provide accurate, current answers.

When you perform a web search, you MUST automatically continue with a thorough analysis following this exact pattern:

1. **Search Intent** (before searching): Briefly state what specific information you're seeking and why it's relevant to the user's question.

2. **Search Execution**: Perform the web search using the web_search tool.

3. **Immediate Analysis** (after search results appear): Without waiting for further prompting, automatically provide:
   - **Key Findings Summary**: Extract the most important information from each source
   - **Cross-Source Analysis**: Identify patterns, consensus, or contradictions between sources
   - **Information Quality**: Note the recency, credibility, and relevance of sources
   - **Knowledge Gaps**: Identify what questions remain unanswered

4. **Synthesis and Answer**: Conclude with a comprehensive response that:
   - Directly addresses the user's original question
   - Integrates search findings with your existing knowledge
   - Uses [Source N] citations for specific claims
   - Suggests follow-up searches if needed for completeness

Remember: After search results appear, immediately continue analyzing and explaining them. Do not wait for the user to ask for analysis - be proactive and thorough in your response.`

        console.log("Web search tool created successfully")
      }

      // For Claude 4.0 thinking mode, enable thinking/reasoning
      if (provider === "anthropic" && isThinking) {
        // Claude 4.0 has native thinking support
        systemPrompt +=
          " For complex questions, show your reasoning process step by step before providing the final answer."
        streamOptions.providerOptions = {
          anthropic: {
            thinking: {
              type: "enabled",
              budgetTokens: 12000, // Budget for thinking tokens
            },
          },
        }
      }

      // Set the combined system prompt
      streamOptions.system = systemPrompt

      console.log(
        `Final streamOptions for ${provider}:`,
        JSON.stringify({
          model: actualModelName,
          temperature: streamOptions.temperature,
          hasTools: !!streamOptions.tools,
          toolNames: streamOptions.tools
            ? Object.keys(streamOptions.tools)
            : [],
          hasSystem: !!streamOptions.system,
          hasProviderOptions: !!streamOptions.providerOptions,
        }),
      )

      const { fullStream, usage } = await streamText(streamOptions)

      let fullContent = ""
      let thinkingContent = ""
      let isInThinkingPhase = false
      let hasThinking = false

      console.log("Starting to process v5 stream chunks...")

      let hasReceivedAnyChunks = false
      let toolCallsProcessed = 0

      // Process each chunk as it arrives from the stream
      for await (const chunk of fullStream) {
        hasReceivedAnyChunks = true
        console.log(
          "Received v5 chunk type:",
          chunk.type,
          "hasText:",
          !!(chunk.type === "text" && "text" in chunk && chunk.text),
        )

        // Handle different types of chunks
        if (chunk.type === "text" && chunk.text) {
          // Regular text content
          fullContent += chunk.text

          // Generate unique chunk ID for resumability
          const chunkId = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

          // Append chunk to the message for resumable streaming
          await ctx.runMutation(internal.messages.appendStreamChunk, {
            messageId,
            chunk: chunk.text,
            chunkId,
          })
        } else if (chunk.type === "tool-call") {
          // Tool calls are now handled automatically by the AI SDK
          // We just track that a tool call occurred for logging
          toolCallsProcessed++
          console.log(
            `Tool call #${toolCallsProcessed} - ${chunk.toolName} with args:`,
            chunk.args,
          )
        } else if (chunk.type === "tool-result") {
          // Handle tool results from automatic execution
          console.log(`Tool result for ${chunk.toolName}:`, chunk.result)
          // Let the AI naturally analyze and format the results through the conversation
        } else if (chunk.type === "reasoning" && chunk.text) {
          // Claude 4.0 native reasoning tokens
          if (!hasThinking) {
            hasThinking = true
            isInThinkingPhase = true
            // Update message to indicate thinking phase
            await ctx.runMutation(internal.messages.updateThinkingState, {
              messageId,
              isThinking: true,
              hasThinkingContent: true,
            })
          }

          // Accumulate thinking content
          thinkingContent += chunk.text

          // Update thinking content progressively
          await ctx.runMutation(internal.messages.updateThinkingContent, {
            messageId,
            thinkingContent,
          })
        } else if (chunk.type === "finish-step" || chunk.type === "finish") {
          // End of reasoning phase or stream completion
          if (isInThinkingPhase && hasThinking) {
            isInThinkingPhase = false
            // Mark end of thinking phase
            await ctx.runMutation(internal.messages.updateThinkingState, {
              messageId,
              isThinking: false,
              hasThinkingContent: true,
            })
          }
        }
      }

      console.log(
        `V5 stream complete. Full content length: ${fullContent.length}, chunks received: ${hasReceivedAnyChunks}, tool calls: ${toolCallsProcessed}`,
      )

      // Don't throw error for empty content when tools are enabled (known AI SDK issue #1831)
      // OpenAI returns empty content blocks when tools are invoked, which is expected behavior
      if (fullContent.trim() === "" && !args.webSearchEnabled) {
        throw new Error(
          `${provider} returned empty response - check API key and quota`,
        )
      }

      // Log if we have empty content with tools enabled (expected behavior)
      if (fullContent.trim() === "" && args.webSearchEnabled) {
        console.log(
          `${provider} returned empty content with tools enabled - this is expected behavior`,
        )

        // If we have no content but processed tool calls, ensure we have some content to display
        if (toolCallsProcessed > 0 && fullContent.trim() === "") {
          fullContent = `Processed ${toolCallsProcessed} web search${toolCallsProcessed > 1 ? "es" : ""}.`
          console.log(
            "Added fallback content for empty response with tool calls",
          )
        }
      }

      // Get final usage data
      const finalUsage = await usage
      console.log("Final usage data:", finalUsage)

      // AI SDK v5 returns LanguageModelV2Usage format
      // Note: values can be undefined, so we need to handle that
      const formattedUsage = finalUsage
        ? {
            inputTokens: finalUsage.inputTokens ?? 0,
            outputTokens: finalUsage.outputTokens ?? 0,
            totalTokens: finalUsage.totalTokens ?? 0,
            reasoningTokens: finalUsage.reasoningTokens ?? 0,
            cachedInputTokens: finalUsage.cachedInputTokens ?? 0,
          }
        : undefined

      console.log("Formatted usage:", formattedUsage)

      // Ensure we always have some content to complete with, even if just tool results
      if (fullContent.trim() === "" && toolCallsProcessed === 0) {
        fullContent =
          "I apologize, but I wasn't able to generate a response. Please try again."
      }

      // Mark message as complete with usage data
      await ctx.runMutation(internal.messages.completeStreamingMessageLegacy, {
        messageId,
        usage: formattedUsage,
      })

      console.log(
        `Message ${messageId} marked as complete with ${fullContent.length} characters`,
      )

      // Clear generation flag on success
      await ctx.runMutation(internal.messages.clearGenerationFlag, {
        threadId: args.threadId,
      })

      console.log(`Generation flag cleared for thread ${args.threadId}`)
    } catch (error) {
      const provider = getProviderFromModelId(args.modelId as ModelId)
      console.error(
        `Error generating ${provider} response with model ${args.modelId}:`,
        error,
      )

      // Add specific error details for debugging
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}`)
        console.error(`Error message: ${error.message}`)
        if (error.stack) {
          console.error(`Error stack: ${error.stack.substring(0, 500)}...`)
        }
      }

      // API key validation is handled at environment initialization
      // Individual provider keys are managed through AI SDK initialization

      try {
        // If we have a messageId, update it with error, otherwise create new error message
        if (messageId) {
          await ctx.runMutation(internal.messages.updateStreamingMessage, {
            messageId,
            content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}. Please check your API keys.`,
          })
          await ctx.runMutation(
            internal.messages.completeStreamingMessageLegacy,
            {
              messageId,
            },
          )
        } else {
          const provider = getProviderFromModelId(args.modelId as ModelId)
          const streamId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          await ctx.runMutation(internal.messages.createErrorMessage, {
            threadId: args.threadId,
            streamId,
            provider,
            modelId: args.modelId,
            errorMessage: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}. Please check your API keys.`,
          })
        }
      } catch (errorHandlingError) {
        console.error("Error during error handling:", errorHandlingError)
      } finally {
        // CRITICAL: Always clear generation flag, even if error handling fails
        try {
          await ctx.runMutation(internal.messages.clearGenerationFlag, {
            threadId: args.threadId,
          })
        } catch (flagClearError) {
          console.error(
            "CRITICAL: Failed to clear generation flag:",
            flagClearError,
          )
          // This is a critical error that could leave the thread in a locked state
        }
      }
    }

    return null
  },
})

// Internal function to get recent conversation context
export const getRecentContext = internalQuery({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(
    v.object({
      body: v.string(),
      messageType: messageTypeValidator,
      attachments: v.optional(v.array(v.id("files"))),
    }),
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(10)

    return messages
      .reverse() // Get chronological order
      .filter((msg: Doc<"messages">) => msg.isComplete !== false) // Only include complete messages
      .map((msg: Doc<"messages">) => ({
        body: msg.body,
        messageType: msg.messageType,
        attachments: msg.attachments,
      }))
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
      id: args.chunkId,
      content: args.chunk,
      timestamp: Date.now(),
      sequence: sequence, // Add sequence for ordering
    }

    // Check for duplicate chunks (race condition protection)
    if (currentChunks.some((chunk) => chunk.id === args.chunkId)) {
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
      modelId: v.string(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { threadId, usage } = args
    const messageUsage = {
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
    // Get the message to find thread and model
    const message = await ctx.db.get(args.messageId)
    if (!message) {
      throw new Error("Message not found")
    }

    // Update the message with completion status and usage
    await ctx.db.patch(args.messageId, {
      isStreaming: false,
      isComplete: true,
      thinkingCompletedAt: Date.now(),
      usage: args.usage,
    })

    // Update thread usage totals atomically if we have usage data
    if (args.usage && message.threadId) {
      await updateThreadUsage(
        ctx,
        message.threadId,
        message.modelId || message.model || "unknown",
        args.usage,
      )
    }

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
    // Get the message to find thread and model
    const message = await ctx.db.get(args.messageId)
    if (!message) {
      throw new Error("Message not found")
    }

    // Update the message with completion status and full text
    await ctx.db.patch(args.messageId, {
      body: args.fullText,
      isStreaming: false,
      isComplete: true,
      thinkingCompletedAt: Date.now(),
      usage: args.usage,
    })

    // Update thread usage totals atomically if we have usage data
    if (args.usage && message.threadId) {
      await updateThreadUsage(
        ctx,
        message.threadId,
        message.modelId || message.model || "unknown",
        args.usage,
      )
    }

    return null
  },
})

// Helper function to update thread usage totals
async function updateThreadUsage(
  ctx: MutationCtx,
  threadId: Id<"threads">,
  model: string,
  messageUsage: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    reasoningTokens?: number
    cachedInputTokens?: number
  },
) {
  // RACE CONDITION FIX: Retry logic for concurrent updates
  const maxRetries = 3
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      const thread = await ctx.db.get(threadId)
      if (!thread) return

      const inputTokens = messageUsage.inputTokens || 0
      const outputTokens = messageUsage.outputTokens || 0
      const totalTokens = messageUsage.totalTokens || 0
      const reasoningTokens = messageUsage.reasoningTokens || 0
      const cachedInputTokens = messageUsage.cachedInputTokens || 0

      // Get existing usage or initialize
      const currentUsage = thread.usage || {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalReasoningTokens: 0,
        totalCachedInputTokens: 0,
        messageCount: 0,
        modelStats: {},
      }

      // Get model-specific ID (e.g., "claude-sonnet-4-20250514" instead of just "anthropic")
      const modelId = getFullModelId(model)

      // Update totals
      const newUsage = {
        totalInputTokens: currentUsage.totalInputTokens + inputTokens,
        totalOutputTokens: currentUsage.totalOutputTokens + outputTokens,
        totalTokens: currentUsage.totalTokens + totalTokens,
        totalReasoningTokens:
          currentUsage.totalReasoningTokens + reasoningTokens,
        totalCachedInputTokens:
          currentUsage.totalCachedInputTokens + cachedInputTokens,
        messageCount: currentUsage.messageCount + 1,
        modelStats: {
          ...currentUsage.modelStats,
          [modelId]: {
            messageCount:
              (currentUsage.modelStats[modelId]?.messageCount || 0) + 1,
            inputTokens:
              (currentUsage.modelStats[modelId]?.inputTokens || 0) +
              inputTokens,
            outputTokens:
              (currentUsage.modelStats[modelId]?.outputTokens || 0) +
              outputTokens,
            totalTokens:
              (currentUsage.modelStats[modelId]?.totalTokens || 0) +
              totalTokens,
            reasoningTokens:
              (currentUsage.modelStats[modelId]?.reasoningTokens || 0) +
              reasoningTokens,
            cachedInputTokens:
              (currentUsage.modelStats[modelId]?.cachedInputTokens || 0) +
              cachedInputTokens,
          },
        },
      }

      // Update thread with new usage
      await ctx.db.patch(threadId, { usage: newUsage })
      return // Success, exit retry loop
    } catch (error) {
      retryCount++
      console.log(
        `Usage update retry ${retryCount}/${maxRetries} for thread ${threadId}`,
      )

      if (retryCount >= maxRetries) {
        console.error(
          `Failed to update thread usage after ${maxRetries} retries:`,
          error,
        )
        throw error
      }

      // Note: In mutations, we can't use setTimeout for delays
      // The retry will happen immediately, relying on Convex's internal conflict resolution
    }
  }
}

// Helper to get full model ID for consistent tracking across providers
function getFullModelId(model: string): string {
  // If it's already a full model ID, return as-is
  if (model.includes("-")) {
    return model
  }

  // Otherwise, convert provider names to default model IDs
  switch (model) {
    case "anthropic":
      return "claude-3-5-sonnet-20241022"
    case "openai":
      return "gpt-4o-mini"
    default:
      return model
  }
}

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

export const getThreadUsage = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.object({
    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),
    totalTokens: v.number(),
    totalReasoningTokens: v.number(),
    totalCachedInputTokens: v.number(),
    messageCount: v.number(),
    modelStats: v.array(
      v.object({
        model: v.string(),
        inputTokens: v.number(),
        outputTokens: v.number(),
        totalTokens: v.number(),
        reasoningTokens: v.number(),
        cachedInputTokens: v.number(),
        messageCount: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalReasoningTokens: 0,
        totalCachedInputTokens: 0,
        messageCount: 0,
        modelStats: [],
      }
    }

    // Verify the user owns this thread
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalReasoningTokens: 0,
        totalCachedInputTokens: 0,
        messageCount: 0,
        modelStats: [],
      }
    }

    // Return usage from thread table (fast O(1) lookup!)
    const usage = thread.usage
    if (!usage) {
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalReasoningTokens: 0,
        totalCachedInputTokens: 0,
        messageCount: 0,
        modelStats: [],
      }
    }

    // Convert modelStats record to array format
    const modelStats = Object.entries(usage.modelStats).map(
      ([model, stats]) => ({
        model,
        inputTokens: stats.inputTokens,
        outputTokens: stats.outputTokens,
        totalTokens: stats.totalTokens,
        reasoningTokens: stats.reasoningTokens,
        cachedInputTokens: stats.cachedInputTokens,
        messageCount: stats.messageCount,
      }),
    )

    return {
      totalInputTokens: usage.totalInputTokens,
      totalOutputTokens: usage.totalOutputTokens,
      totalTokens: usage.totalTokens,
      totalReasoningTokens: usage.totalReasoningTokens,
      totalCachedInputTokens: usage.totalCachedInputTokens,
      messageCount: usage.messageCount,
      modelStats,
    }
  },
})

// Query to get stream chunks for resumable streaming
export const getStreamChunks = query({
  args: {
    streamId: streamIdValidator,
    sinceChunkId: v.optional(chunkIdValidator),
  },
  returns: v.object({
    chunks: v.array(streamChunkValidator),
    isComplete: v.boolean(),
    currentBody: v.string(),
    messageId: v.optional(v.id("messages")),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return {
        chunks: [],
        isComplete: true,
        currentBody: "",
        messageId: undefined,
      }
    }

    // Find the message with this streamId
    const message = await ctx.db
      .query("messages")
      .withIndex("by_stream_id", (q) => q.eq("streamId", args.streamId))
      .first()

    if (!message) {
      return {
        chunks: [],
        isComplete: true,
        currentBody: "",
        messageId: undefined,
      }
    }

    // Verify the user owns the thread containing this message
    const thread = await ctx.db.get(message.threadId)
    if (!thread || thread.userId !== userId) {
      return {
        chunks: [],
        isComplete: true,
        currentBody: "",
        messageId: undefined,
      }
    }

    const streamChunks = message.streamChunks || []

    // If sinceChunkId is provided, filter to only newer chunks
    let newChunks = streamChunks
    if (args.sinceChunkId) {
      const sinceIndex = streamChunks.findIndex(
        (chunk) => chunk.id === args.sinceChunkId,
      )
      if (sinceIndex >= 0) {
        // Return chunks after the sinceChunkId
        newChunks = streamChunks.slice(sinceIndex + 1)
      }
    }

    return {
      chunks: newChunks,
      isComplete: message.isComplete !== false,
      currentBody: message.body,
      messageId: message._id,
    }
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

// Internal query to get thread by ID
export const getThreadById = internalQuery({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.union(
    v.object({
      _id: v.id("threads"),
      _creationTime: v.number(),
      userId: v.id("users"),
      clientId: v.optional(clientIdValidator),
      title: v.string(),
      createdAt: v.number(),
      lastMessageAt: v.number(),
      isGenerating: v.optional(v.boolean()),
      isTitleGenerating: v.optional(v.boolean()),
      pinned: v.optional(v.boolean()),
      // Branch information
      branchedFrom: branchInfoValidator,
      // Share functionality
      isPublic: v.optional(v.boolean()),
      shareId: v.optional(shareIdValidator),
      sharedAt: v.optional(v.number()),
      shareSettings: shareSettingsValidator,
      usage: threadUsageValidator,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId)
  },
})
