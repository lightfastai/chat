import { v } from "convex/values"
import {
  chunkIdValidator,
  messageTypeValidator,
  modelIdValidator,
  modelProviderValidator,
  streamChunkValidator,
  streamIdValidator,
  tokenUsageValidator,
} from "../validators.js"

// Define message part types separately to reduce schema complexity
export const textPartValidator = v.object({
  type: v.literal("text"),
  content: v.optional(v.string()),
})

export const toolInvocationPartValidator = v.object({
  type: v.literal("tool-invocation"),
  content: v.optional(v.string()),
  toolCallId: v.optional(v.string()),
  toolName: v.optional(v.string()),
  args: v.optional(v.any()),
  state: v.optional(
    v.union(
      v.literal("partial-call"),
      v.literal("call"),
      v.literal("result"),
      v.literal("error"),
    ),
  ),
  result: v.optional(v.any()),
  error: v.optional(v.string()),
})

export const reasoningPartValidator = v.object({
  type: v.literal("reasoning"),
  content: v.optional(v.string()),
})

export const sourcePartValidator = v.object({
  type: v.literal("source"),
  content: v.optional(v.string()),
})

export const stepStartPartValidator = v.object({
  type: v.literal("step-start"),
  content: v.optional(v.string()),
})

// Simplified message part validator
export const messagePartValidator = v.union(
  textPartValidator,
  toolInvocationPartValidator,
  reasoningPartValidator,
  sourcePartValidator,
  stepStartPartValidator,
)

// Shared message return type for queries
export const messageReturnValidator = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
  threadId: v.id("threads"),
  body: v.string(),
  timestamp: v.number(),
  messageType: messageTypeValidator,
  model: v.optional(modelProviderValidator),
  modelId: v.optional(modelIdValidator),
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
  toolInvocations: v.optional(v.array(v.any())),
})

// Type for message usage updates
export interface MessageUsageUpdate {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  cachedInputTokens?: number
}

// Type for formatted usage data
export interface FormattedUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  reasoningTokens: number
  cachedInputTokens: number
}

// Type for AI SDK usage data
export interface AISDKUsage {
  promptTokens?: number
  completionTokens?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  cachedInputTokens?: number
  completionTokensDetails?: {
    reasoningTokens?: number
  }
  promptTokensDetails?: {
    cachedTokens?: number
  }
}

// Helper to format usage data from AI SDK
export function formatUsageData(
  usage: AISDKUsage | undefined | null,
): FormattedUsage | undefined {
  if (!usage) return undefined

  return {
    inputTokens: usage.inputTokens ?? usage.promptTokens ?? 0,
    outputTokens: usage.outputTokens ?? usage.completionTokens ?? 0,
    totalTokens:
      usage.totalTokens ??
      (usage.inputTokens ?? usage.promptTokens ?? 0) +
        (usage.outputTokens ?? usage.completionTokens ?? 0),
    reasoningTokens:
      usage.reasoningTokens ??
      usage.completionTokensDetails?.reasoningTokens ??
      0,
    cachedInputTokens:
      usage.cachedInputTokens ?? usage.promptTokensDetails?.cachedTokens ?? 0,
  }
}
