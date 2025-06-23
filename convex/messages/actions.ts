import { type CoreMessage, stepCountIs, streamText } from "ai"
import { v } from "convex/values"
import {
  type ModelId,
  getProviderFromModelId,
} from "../../src/lib/ai/schemas.js"
import { internal } from "../_generated/api.js"
import type { Id } from "../_generated/dataModel.js"
import { internalAction } from "../_generated/server.js"
import { createAIClient } from "../lib/ai_client.js"
import { createGitAnalysisTool, createGitHubAPITool, createWebSearchTool } from "../lib/ai_tools.js"
import { requireResource } from "../lib/errors.js"
import {
  buildMessageContent,
  createSystemPrompt,
} from "../lib/message_builder.js"
import {
  buildConversationMessages,
  clearGenerationFlag as clearGenerationFlagUtil,
  createStreamingMessage as createStreamingMessageUtil,
  streamAIResponse,
  updateThreadUsage as updateThreadUsageUtil,
} from "../lib/message_service.js"
import { modelIdValidator, streamIdValidator } from "../validators.js"
import {
  generateChunkId,
  generateStreamId,
  handleAIResponseError,
} from "./helpers.js"
import { type AISDKUsage, formatUsageData } from "./types.js"

// New action that uses pre-created message ID
export const generateAIResponseWithMessage = internalAction({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
    modelId: modelIdValidator,
    attachments: v.optional(v.array(v.id("files"))),
    webSearchEnabled: v.optional(v.boolean()),
    gitAnalysisEnabled: v.optional(v.boolean()),
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
      requireResource(thread, "Thread")

      // Derive provider from modelId
      const provider = getProviderFromModelId(args.modelId as ModelId)

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
      const systemPrompt = createSystemPrompt(
        args.modelId,
        args.webSearchEnabled,
        args.gitAnalysisEnabled,
      )

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

      // Create AI client using shared utility
      const ai = createAIClient(args.modelId as ModelId, userApiKeys)

      // Update token usage function
      const updateUsage = async (usage: AISDKUsage) => {
        if (usage) {
          const promptTokens = usage.promptTokens || 0
          const completionTokens = usage.completionTokens || 0
          const totalTokens =
            usage.totalTokens || promptTokens + completionTokens

          await ctx.runMutation(internal.messages.updateThreadUsageMutation, {
            threadId: args.threadId,
            usage: {
              promptTokens,
              completionTokens,
              totalTokens,
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
        model: ai,
        messages: messages,
        // Usage will be updated after streaming completes
      }

      // Add tools if enabled
      const tools: any = {}

      if (args.webSearchEnabled) {
        tools.web_search = createWebSearchTool()
      }

      if (args.gitAnalysisEnabled) {
        tools.git_analysis = createGitAnalysisTool(ctx, args.threadId)
        tools.github_api = createGitHubAPITool()
      }

      if (Object.keys(tools).length > 0) {
        generationOptions.tools = tools
        // Enable iterative tool calling with stopWhen
        generationOptions.stopWhen = stepCountIs(5) // Allow up to 5 iterations
        
        // Add prepareStep for Computer instance management
        if (args.gitAnalysisEnabled) {
          generationOptions.experimental_prepareStep = async ({ steps, stepNumber }) => {
            // Check if any previous step used git_analysis tool
            const hasGitAnalysisCall = steps.some(step => 
              step.toolCalls?.some(tc => tc.toolName === 'git_analysis')
            )
            
            // If git analysis was called, ensure Computer instance is ready
            if (hasGitAnalysisCall && stepNumber > 0) {
              // TODO: Re-enable once types regenerate
              // await ctx.runMutation(internal.messages.updateComputerOperation, {
              //   threadId: args.threadId,
              //   operation: "Preparing for next operation",
              // })
            }
            
            // Could return different settings per step if needed
            return undefined // Use default settings
          }
        }
      }

      // Use the AI SDK v5 streamText
      const result = streamText(generationOptions)

      let fullText = ""
      let hasContent = false

      // Process the stream
      for await (const chunk of result.textStream) {
        if (chunk) {
          fullText += chunk
          hasContent = true
          const chunkId = generateChunkId()

          await ctx.runMutation(internal.messages.appendStreamChunk, {
            messageId: args.messageId,
            chunk,
            chunkId,
          })
        }
      }

      // Process tool calls if any tools are enabled
      if (args.webSearchEnabled || args.gitAnalysisEnabled) {
        for await (const streamPart of result.fullStream) {
          if (streamPart.type === "tool-call") {
            // Check if this is a git analysis tool call
            if (streamPart.toolName === "git_analysis") {
              // TODO: Enable computer status tracking once types are synced
              // await ctx.runMutation(internal.messages.updateComputerStatus, {
              //   threadId: args.threadId,
              //   status: {
              //     isRunning: true,
              //     instanceId: `instance_${Date.now()}`,
              //     currentOperation: "Initializing git analysis",
              //     startedAt: Date.now(),
              //   },
              // })
              // Extract operation from args if available
              // try {
              //   const toolArgs = streamPart.args as any
              //   if (toolArgs?.operation) {
              //     await ctx.runMutation(internal.messages.updateComputerOperation, {
              //       threadId: args.threadId,
              //       operation: `${toolArgs.operation}: ${
              //         toolArgs.repoUrl || toolArgs.path || "processing"
              //       }`,
              //     })
              //   }
              // } catch (e) {
              //   // Ignore parsing errors
              // }
            }
          }

          if (streamPart.type === "tool-result") {
            // Check if this is a git analysis tool result
            if (streamPart.toolName === "git_analysis") {
              // TODO: Enable computer status tracking once types are synced
              // await ctx.runMutation(internal.messages.updateComputerStatus, {
              //   threadId: args.threadId,
              //   status: {
              //     isRunning: false,
              //   },
              // })
            }
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
        // Format usage data for the message
        const formattedUsage = formatUsageData(finalUsage)

        await ctx.runMutation(internal.messages.completeStreamingMessage, {
          messageId: args.messageId,
          streamId: args.streamId,
          fullText,
          usage: formattedUsage,
        })
      }

      // Clear the generation flag on success
      await ctx.runMutation(internal.messages.clearGenerationFlag, {
        threadId: args.threadId,
      })
    } catch (error) {
      await handleAIResponseError(ctx, error, args.threadId, args.messageId, {
        modelId: args.modelId,
        provider: getProviderFromModelId(args.modelId as ModelId),
      })
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
    gitAnalysisEnabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let messageId: Id<"messages"> | null = null
    try {
      // Get thread and user information
      const thread = await ctx.runQuery(internal.messages.getThreadById, {
        threadId: args.threadId,
      })
      requireResource(thread, "Thread")

      // Derive provider from modelId
      const provider = getProviderFromModelId(args.modelId as ModelId)

      // Get user's API keys if available
      const userApiKeys = await ctx.runMutation(
        internal.userSettings.getDecryptedApiKeys,
        { userId: thread.userId },
      )

      // Generate unique stream ID and create streaming message
      const streamId = generateStreamId()
      messageId = await createStreamingMessageUtil(
        ctx,
        args.threadId,
        args.modelId as ModelId,
        streamId,
        !!(
          (provider === "anthropic" && userApiKeys?.anthropic) ||
          (provider === "openai" && userApiKeys?.openai) ||
          (provider === "openrouter" && userApiKeys?.openrouter)
        ),
      )

      // Build conversation messages using shared utility
      const messages = await buildConversationMessages(
        ctx,
        args.threadId,
        args.modelId as ModelId,
        args.attachments,
        args.webSearchEnabled,
        args.gitAnalysisEnabled,
      )

      console.log(
        `Attempting to call ${provider} with model ID ${args.modelId} and ${messages.length} messages`,
      )
      console.log(`Schema fix timestamp: ${Date.now()}`)
      console.log(`Web search enabled: ${args.webSearchEnabled}`)
      console.log(`Git analysis enabled: ${args.gitAnalysisEnabled}`)

      // Stream AI response using shared utility
      const { usage: finalUsage } = await streamAIResponse(
        ctx,
        args.modelId as ModelId,
        messages,
        messageId,
        args.threadId,
        userApiKeys,
        args.webSearchEnabled,
        args.gitAnalysisEnabled,
        undefined, // prepareStep - not used in legacy generateAIResponse
      )

      // Update thread usage using shared utility
      await updateThreadUsageUtil(
        ctx,
        args.threadId,
        args.modelId as ModelId,
        finalUsage,
      )

      // Mark message as complete with usage data
      const formattedUsage = formatUsageData(finalUsage)

      await ctx.runMutation(internal.messages.completeStreamingMessageLegacy, {
        messageId,
        usage: formattedUsage,
      })

      // Clear generation flag using shared utility
      await clearGenerationFlagUtil(ctx, args.threadId)
    } catch (error) {
      const provider = getProviderFromModelId(args.modelId as ModelId)
      console.error(
        `Error generating ${provider} response with model ${args.modelId}:`,
        error,
      )

      await handleAIResponseError(
        ctx,
        error,
        args.threadId,
        messageId || undefined,
        {
          modelId: args.modelId,
          provider,
          useStreamingUpdate: true,
        },
      )
    }

    return null
  },
})
