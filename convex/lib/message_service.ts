import type { CoreMessage } from "ai"
import { stepCountIs, streamText, tool } from "ai"
import Exa, {
  type RegularSearchOptions,
  type ContentsOptions,
  type SearchResult,
} from "exa-js"
import { z } from "zod"
import type { ModelId } from "../../src/lib/ai/types.js"
import {
  getProviderFromModelId,
  isThinkingMode,
} from "../../src/lib/ai/types.js"
import { internal } from "../_generated/api.js"
import type { Id } from "../_generated/dataModel.js"
import type { ActionCtx } from "../_generated/server.js"
import { env } from "../env.js"
import { createAIClient } from "./ai_client.js"
import { buildMessageContent, createSystemPrompt } from "./message_builder.js"

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
            maxCharacters: 2000,
            includeHtmlTags: false,
          },
          highlights: {
            numSentences: 5,
            highlightsPerUrl: 4,
          },
        }

        const response = await exa.searchAndContents(query, searchOptions)

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

        return {
          success: true,
          query,
          searchIntent: `Web search for: "${query}"`,
          resultCount: results.length,
          results: results.map((r, idx) => ({
            ...r,
            relevanceRank: idx + 1,
            fullText: r.text || "No content available",
            summary: r.text
              ? r.text.length > 300
                ? `${r.text.slice(0, 300)}...`
                : r.text
              : "No preview available",
            keyPoints: r.highlights || [],
          })),
          searchMetadata: {
            timestamp: new Date().toISOString(),
            autoprompt: response.autopromptString,
          },
          instructions:
            "Analyze these search results thoroughly and provide a comprehensive explanation of the findings.",
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

/**
 * Generate a unique stream ID
 */
export function generateStreamId(): string {
  return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create initial streaming message
 */
export async function createStreamingMessage(
  ctx: ActionCtx,
  threadId: Id<"threads">,
  modelId: ModelId,
  streamId: string,
  usedUserApiKey: boolean,
): Promise<Id<"messages">> {
  const provider = getProviderFromModelId(modelId)

  return await ctx.runMutation(internal.messages.createStreamingMessage, {
    threadId,
    streamId,
    provider,
    modelId,
    usedUserApiKey,
  })
}

/**
 * Build conversation messages for AI
 */
export async function buildConversationMessages(
  ctx: ActionCtx,
  threadId: Id<"threads">,
  modelId: ModelId,
  attachments?: Id<"files">[],
  webSearchEnabled?: boolean,
): Promise<CoreMessage[]> {
  // Get recent conversation context
  const recentMessages = await ctx.runQuery(
    internal.messages.getRecentContext,
    { threadId },
  )

  const provider = getProviderFromModelId(modelId)
  const systemPrompt = createSystemPrompt(modelId, webSearchEnabled)

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
      isLastUserMessage && attachments ? attachments : msg.attachments

    // Build message content with attachments
    const content = await buildMessageContent(
      ctx,
      msg.body,
      attachmentsToUse,
      provider,
      modelId,
    )

    messages.push({
      role: msg.messageType === "user" ? "user" : "assistant",
      content,
    } as CoreMessage)
  }

  return messages
}

/**
 * Stream AI response
 */
export async function streamAIResponse(
  ctx: ActionCtx,
  modelId: ModelId,
  messages: CoreMessage[],
  messageId: Id<"messages">,
  userApiKeys: {
    openai?: string
    anthropic?: string
    openrouter?: string
  } | null,
  webSearchEnabled?: boolean,
) {
  const provider = getProviderFromModelId(modelId)
  const aiClient = createAIClient(modelId, userApiKeys)

  // Prepare generation options
  const generationOptions: Parameters<typeof streamText>[0] = {
    model: aiClient,
    messages,
    temperature: 0.7,
  }

  // Add web search tool if enabled
  if (webSearchEnabled) {
    generationOptions.tools = {
      web_search: createWebSearchTool(),
    }
    generationOptions.stopWhen = stepCountIs(5)
  }

  // For Claude 4.0 thinking mode, enable thinking/reasoning
  if (provider === "anthropic" && isThinkingMode(modelId)) {
    generationOptions.providerOptions = {
      anthropic: {
        thinking: {
          type: "enabled",
          budgetTokens: 12000,
        },
      },
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
        messageId,
        chunk,
        chunkId,
      })
    }
  }

  // Process tool calls if web search is enabled
  if (webSearchEnabled) {
    for await (const streamPart of result.fullStream) {
      if (streamPart.type === "tool-call") {
        toolCallsInProgress++
      }
    }
  }

  // Get final usage with optional chaining
  const finalUsage = await result.usage

  return {
    fullText,
    hasContent,
    toolCallsInProgress,
    usage: finalUsage,
  }
}

/**
 * Update thread usage with retry logic
 */
export async function updateThreadUsage(
  ctx: ActionCtx,
  threadId: Id<"threads">,
  modelId: ModelId,
  usage:
    | {
        promptTokens?: number
        inputTokens?: number
        completionTokens?: number
        outputTokens?: number
        totalTokens?: number
        completionTokensDetails?: { reasoningTokens?: number }
        reasoningTokens?: number
        promptTokensDetails?: { cachedTokens?: number }
        cachedInputTokens?: number
      }
    | null
    | undefined,
) {
  if (!usage) return

  const promptTokens = usage.promptTokens || usage.inputTokens || 0
  const completionTokens = usage.completionTokens || usage.outputTokens || 0
  const totalTokens = usage.totalTokens || promptTokens + completionTokens

  await ctx.runMutation(internal.messages.updateThreadUsageMutation, {
    threadId,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
      reasoningTokens:
        usage.completionTokensDetails?.reasoningTokens ||
        usage.reasoningTokens ||
        0,
      cachedTokens:
        usage.promptTokensDetails?.cachedTokens || usage.cachedInputTokens || 0,
      modelId,
    },
  })
}

/**
 * Clear generation flag
 */
export async function clearGenerationFlag(
  ctx: ActionCtx,
  threadId: Id<"threads">,
) {
  await ctx.runMutation(internal.messages.clearGenerationFlag, {
    threadId,
  })
}
