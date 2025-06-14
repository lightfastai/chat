import { anthropic, createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI, openai } from "@ai-sdk/openai"
import { getAuthUserId } from "@convex-dev/auth/server"
import { streamText, tool } from "ai"
import { v } from "convex/values"
import Exa from "exa-js"
import { z } from "zod"
import { internal } from "./_generated/api.js"
import type { Doc, Id } from "./_generated/dataModel.js"
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js"

// Import shared types and utilities
import {
  ALL_MODEL_IDS,
  type ModelId,
  getActualModelName,
  getProviderFromModelId,
  isThinkingMode,
} from "../src/lib/ai/types.js"

// Create web search tool using proper AI SDK v5 pattern
function createWebSearchTool() {
  return tool({
    description:
      "Search the web for current information, news, and real-time data. Use this when you need up-to-date information beyond your knowledge cutoff.",
    parameters: z.object({
      query: z
        .string()
        .describe("The search query to find relevant web results"),
    }),
    execute: async ({ query }) => {
      console.log(`Executing web search for: "${query}"`)

      const exaApiKey = process.env.EXA_API_KEY
      if (!exaApiKey) {
        throw new Error("EXA_API_KEY not configured")
      }

      try {
        const exa = new Exa(exaApiKey)
        const numResults = 5
        const searchOptions = {
          numResults,
          text: {
            maxCharacters: 1000,
            includeHtmlTags: false,
          },
          highlights: {
            numSentences: 3,
            highlightsPerUrl: 2,
          },
        } as any

        const response = await exa.search(query, searchOptions)

        const results = response.results.map((result: any) => ({
          id: result.id,
          url: result.url,
          title: result.title || "",
          text: result.text,
          highlights: result.highlights,
          publishedDate: result.publishedDate,
          author: result.author,
          score: result.score,
        }))

        console.log(`Web search found ${results.length} results`)

        return {
          success: true,
          query,
          results: results.slice(0, 3), // Return top 3 results
          totalResults: results.length,
        }
      } catch (error) {
        console.error("Web search error:", error)
        return {
          success: false,
          query,
          error: error instanceof Error ? error.message : "Unknown error",
          results: [],
          totalResults: 0,
        }
      }
    },
  })
}

// Create validators from the shared types
const modelIdValidator = v.union(...ALL_MODEL_IDS.map((id) => v.literal(id)))
const modelProviderValidator = v.union(
  v.literal("openai"),
  v.literal("anthropic"),
)

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
      messageType: v.union(v.literal("user"), v.literal("assistant")),
      model: v.optional(modelProviderValidator),
      modelId: v.optional(v.string()), // Keep as string for flexibility but validate in handler
      isStreaming: v.optional(v.boolean()),
      streamId: v.optional(v.string()),
      isComplete: v.optional(v.boolean()),
      thinkingStartedAt: v.optional(v.number()),
      thinkingCompletedAt: v.optional(v.number()),
      thinkingContent: v.optional(v.string()),
      isThinking: v.optional(v.boolean()),
      hasThinkingContent: v.optional(v.boolean()),
      usedUserApiKey: v.optional(v.boolean()),
      usage: v.optional(
        v.object({
          inputTokens: v.optional(v.number()),
          outputTokens: v.optional(v.number()),
          totalTokens: v.optional(v.number()),
          reasoningTokens: v.optional(v.number()),
          cachedInputTokens: v.optional(v.number()),
        }),
      ),
      lastChunkId: v.optional(v.string()),
      streamChunks: v.optional(
        v.array(
          v.object({
            id: v.string(),
            content: v.string(),
            timestamp: v.number(),
            sequence: v.optional(v.number()),
          }),
        ),
      ),
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
    })

    // Schedule AI response using the modelId
    await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
      threadId: args.threadId,
      userMessage: args.body,
      modelId: modelId,
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
    clientId: v.string(),
    body: v.string(),
    modelId: v.optional(modelIdValidator),
    webSearchEnabled: v.optional(v.boolean()),
  },
  returns: v.id("threads"),
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
    })

    // Insert user message
    await ctx.db.insert("messages", {
      threadId,
      body: args.body,
      timestamp: now,
      messageType: "user",
      model: provider,
      modelId: modelId,
    })

    // Schedule AI response
    await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
      threadId,
      userMessage: args.body,
      modelId: modelId,
      webSearchEnabled: args.webSearchEnabled,
    })

    // Schedule title generation (this is the first message)
    await ctx.scheduler.runAfter(100, internal.titles.generateTitle, {
      threadId,
      userMessage: args.body,
    })

    return threadId
  },
})

// Internal action to generate AI response using AI SDK v5
export const generateAIResponse = internalAction({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
    modelId: modelIdValidator, // Use validated modelId
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
        (provider === "openai" && userApiKeys && userApiKeys.openai)

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

      // Prepare messages for AI SDK v5 - using standard format
      const messages = [
        {
          role: "system" as const,
          content:
            "You are a helpful AI assistant in a chat conversation. Be concise and friendly.",
        },
        ...recentMessages.map((msg) => ({
          role:
            msg.messageType === "user"
              ? ("user" as const)
              : ("assistant" as const),
          content: msg.body,
        })),
      ]

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
          : userApiKeys?.openai
            ? createOpenAI({ apiKey: userApiKeys.openai })(actualModelName)
            : openai(actualModelName)

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
        const exaApiKey = process.env.EXA_API_KEY
        if (!exaApiKey) {
          console.error("EXA_API_KEY not found - web search will fail")
        }

        console.log("Creating web_search tool...")
        streamOptions.tools = {
          web_search: createWebSearchTool(),
        }
        console.log("Web search tool created successfully")
      }

      // For Claude 4.0 thinking mode, enable thinking/reasoning
      if (provider === "anthropic" && isThinking) {
        // Claude 4.0 has native thinking support
        streamOptions.system =
          "You are a helpful AI assistant. For complex questions, show your reasoning process step by step before providing the final answer."
        streamOptions.providerOptions = {
          anthropic: {
            thinking: {
              type: "enabled",
              budgetTokens: 12000, // Budget for thinking tokens
            },
          },
        }
      }

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
        } else if (
          chunk.type === "tool-call" &&
          chunk.toolName === "web_search"
        ) {
          // Handle web search tool calls
          toolCallsProcessed++
          console.log(
            `Processing tool call #${toolCallsProcessed} - web search with args:`,
            chunk.args,
          )

          try {
            // Perform web search directly using Exa
            const exaApiKey = process.env.EXA_API_KEY
            if (!exaApiKey) {
              throw new Error("EXA_API_KEY not configured")
            }

            const exa = new Exa(exaApiKey)
            const query = chunk.args.query as string
            const numResults = 5 // Fixed to 5 results for simplicity
            const includeText = true // Always include text for better results

            const searchOptions = {
              numResults,
            } as any

            if (includeText) {
              searchOptions.text = {
                maxCharacters: 1000,
                includeHtmlTags: false,
              }
              searchOptions.highlights = {
                numSentences: 3,
                highlightsPerUrl: 2,
              }
            }

            const response = await exa.search(query, searchOptions)

            const searchResults = {
              success: true,
              results: response.results.map((result) => ({
                id: result.id,
                url: result.url,
                title: result.title || "",
                text: result.text,
                highlights: (result as any).highlights,
                publishedDate: result.publishedDate,
                author: result.author,
                score: result.score,
              })),
              autopromptString: response.autopromptString,
            }

            if (searchResults.success && searchResults.results) {
              const searchSummary =
                `\n\n**🔍 Web Search Results for "${chunk.args.query}"**\n\n` +
                searchResults.results
                  .slice(0, 3)
                  .map(
                    (result, i) =>
                      `**${i + 1}. ${result.title}**\n${result.url}\n${result.text ? `${result.text.slice(0, 250)}...` : "No preview available"}\n`,
                  )
                  .join("\n")

              fullContent += searchSummary

              // Generate unique chunk ID for the search results
              const chunkId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

              // Append search results as a chunk
              await ctx.runMutation(internal.messages.appendStreamChunk, {
                messageId,
                chunk: searchSummary,
                chunkId,
              })
            } else {
              const errorMessage = `\n\n*❌ Web search failed: No results found*\n\n`
              fullContent += errorMessage

              const chunkId = `search_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              await ctx.runMutation(internal.messages.appendStreamChunk, {
                messageId,
                chunk: errorMessage,
                chunkId,
              })
            }
          } catch (error) {
            console.error("Error executing web search:", error)
            const errorMessage = `\n\n*❌ Web search error: ${error instanceof Error ? error.message : "Unknown error"}*\n\n`
            fullContent += errorMessage

            const chunkId = `search_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            await ctx.runMutation(internal.messages.appendStreamChunk, {
              messageId,
              chunk: errorMessage,
              chunkId,
            })
          }
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

      // Ensure we always have some content to complete with, even if just tool results
      if (fullContent.trim() === "" && toolCallsProcessed === 0) {
        fullContent =
          "I apologize, but I wasn't able to generate a response. Please try again."
      }

      // Mark message as complete with usage data
      await ctx.runMutation(internal.messages.completeStreamingMessage, {
        messageId,
        usage: finalUsage,
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

      // Check for common API key issues
      if (provider === "openai") {
        const openaiKey = process.env.OPENAI_API_KEY
        console.log(`OpenAI API key present: ${!!openaiKey}`)
        console.log(
          `OpenAI API key format valid: ${openaiKey?.startsWith("sk-") || false}`,
        )
      }

      if (provider === "anthropic") {
        const anthropicKey = process.env.ANTHROPIC_API_KEY
        console.log(`Anthropic API key present: ${!!anthropicKey}`)
        console.log(
          `Anthropic API key format valid: ${anthropicKey?.startsWith("sk-ant-") || false}`,
        )
      }

      try {
        // If we have a messageId, update it with error, otherwise create new error message
        if (messageId) {
          await ctx.runMutation(internal.messages.updateStreamingMessage, {
            messageId,
            content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}. Please check your API keys.`,
          })
          await ctx.runMutation(internal.messages.completeStreamingMessage, {
            messageId,
          })
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
      messageType: v.union(v.literal("user"), v.literal("assistant")),
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
      }))
  },
})

// Internal mutation to create initial streaming message
export const createStreamingMessage = internalMutation({
  args: {
    threadId: v.id("threads"),
    streamId: v.string(),
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
    chunkId: v.string(),
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

// Internal mutation to mark streaming as complete and update thread usage
export const completeStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    usage: v.optional(
      v.object({
        inputTokens: v.optional(v.number()),
        outputTokens: v.optional(v.number()),
        totalTokens: v.optional(v.number()),
        reasoningTokens: v.optional(v.number()),
        cachedInputTokens: v.optional(v.number()),
      }),
    ),
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

// Helper function to update thread usage totals
async function updateThreadUsage(
  ctx: {
    db: {
      get: (id: Id<"threads">) => Promise<Doc<"threads"> | null>
      patch: (
        id: Id<"threads">,
        fields: Partial<Doc<"threads">>,
      ) => Promise<void>
    }
  },
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

      // Brief delay before retry
      await new Promise((resolve) => setTimeout(resolve, 10 * retryCount))
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
      return "claude-sonnet-4-20250514"
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
    streamId: v.string(),
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
    streamId: v.string(),
    sinceChunkId: v.optional(v.string()),
  },
  returns: v.object({
    chunks: v.array(
      v.object({
        id: v.string(),
        content: v.string(),
        timestamp: v.number(),
        sequence: v.optional(v.number()),
      }),
    ),
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
      clientId: v.optional(v.string()),
      title: v.string(),
      createdAt: v.number(),
      lastMessageAt: v.number(),
      isGenerating: v.optional(v.boolean()),
      isTitleGenerating: v.optional(v.boolean()),
      usage: v.optional(
        v.object({
          totalInputTokens: v.number(),
          totalOutputTokens: v.number(),
          totalTokens: v.number(),
          totalReasoningTokens: v.number(),
          totalCachedInputTokens: v.number(),
          messageCount: v.number(),
          modelStats: v.record(
            v.string(),
            v.object({
              messageCount: v.number(),
              inputTokens: v.number(),
              outputTokens: v.number(),
              totalTokens: v.number(),
              reasoningTokens: v.number(),
              cachedInputTokens: v.number(),
            }),
          ),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId)
  },
})
