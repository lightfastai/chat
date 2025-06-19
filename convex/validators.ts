import { v } from "convex/values"

/**
 * Shared validators for type safety across Convex functions
 *
 * These validators ensure consistent data validation and provide
 * better type inference throughout the backend.
 */

// ===== Model Validators =====
// Model ID validator for all supported AI models
export const modelIdValidator = v.union(
  // OpenAI models
  v.literal("gpt-4o-mini"),
  v.literal("gpt-4o"),
  v.literal("gpt-4.1"),
  v.literal("o3"),
  v.literal("gpt-4.1-mini"),
  v.literal("gpt-4.1-nano"),
  v.literal("o3-mini"),
  v.literal("o4-mini"),
  v.literal("gpt-3.5-turbo"),
  // Anthropic models
  v.literal("claude-4-opus-20250514"),
  v.literal("claude-4-sonnet-20250514"),
  v.literal("claude-3-7-sonnet-20250219"),
  v.literal("claude-3-5-sonnet-20241022"),
  v.literal("claude-3-5-sonnet-20240620"),
  v.literal("claude-3-5-haiku-20241022"),
  // Thinking mode variants
  v.literal("claude-4-opus-20250514-thinking"),
  v.literal("claude-4-sonnet-20250514-thinking"),
  v.literal("claude-3-7-sonnet-20250219-thinking"),
  v.literal("claude-3-5-sonnet-20241022-thinking"),
  v.literal("claude-3-5-sonnet-20240620-thinking"),
  v.literal("claude-3-5-haiku-20241022-thinking"),
  // Legacy model IDs for backward compatibility
  v.literal("claude-sonnet-4-20250514"),
  v.literal("claude-sonnet-4-20250514-thinking"),
  v.literal("claude-3-haiku-20240307"),
  // OpenRouter models
  v.literal("meta-llama/llama-3.3-70b-instruct"),
  v.literal("anthropic/claude-3.5-sonnet"),
  v.literal("openai/gpt-4o"),
  v.literal("google/gemini-pro-1.5"),
  v.literal("mistralai/mistral-large"),
  v.literal("x-ai/grok-3-beta"),
  v.literal("x-ai/grok-3-mini-beta"),
  v.literal("google/gemini-2.5-pro-preview"),
  v.literal("google/gemini-2.5-flash-preview"),
)

// Model provider validator
export const modelProviderValidator = v.union(
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("openrouter"),
)

// ===== ID Validators =====
// Client ID validator (nanoid format, typically 21 chars)
export const clientIdValidator = v.string()

// Share ID validator (nanoid format, 24 chars for security)
export const shareIdValidator = v.string()

// Stream ID validator (format: stream_<timestamp>_<random>)
export const streamIdValidator = v.string()

// Chunk ID validator (format: chunk_<timestamp>_<random>)
export const chunkIdValidator = v.string()

// Storage ID validator for Convex file storage
export const storageIdValidator = v.string()

// ===== String Format Validators =====
// Email validator with basic format checking
export const emailValidator = v.string()

// URL validator for links and images
export const urlValidator = v.string()

// Phone number validator
export const phoneValidator = v.optional(v.string())

// API key validators with provider-specific patterns
export const openaiApiKeyValidator = v.string() // sk-...
export const anthropicApiKeyValidator = v.string() // sk-ant-...
export const openrouterApiKeyValidator = v.string()

// ===== Content Validators =====
// Title validator with max length
export const titleValidator = v.string() // Max 80 chars enforced in handler

// User name validator
export const userNameValidator = v.string()

// Comment/feedback validator with reasonable length
export const commentValidator = v.optional(v.string())

// File name validator
export const fileNameValidator = v.string()

// MIME type validator
export const mimeTypeValidator = v.string()

// IP hash validator for security/rate limiting
export const ipHashValidator = v.optional(v.string())

// User agent validator
export const userAgentValidator = v.optional(v.string())

// ===== Message Type Validators =====
export const messageTypeValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
)

// ===== Feedback Validators =====
export const feedbackRatingValidator = v.union(
  v.literal("positive"),
  v.literal("negative"),
)

// Feedback reasons validator
export const feedbackReasonsValidator = v.optional(v.array(v.string()))

// ===== Usage/Token Validators =====
export const tokenUsageValidator = v.optional(
  v.object({
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    cachedInputTokens: v.optional(v.number()),
  }),
)

// Thread usage validator
export const threadUsageValidator = v.optional(
  v.object({
    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),
    totalTokens: v.number(),
    totalReasoningTokens: v.number(),
    totalCachedInputTokens: v.number(),
    messageCount: v.number(),
    modelStats: v.record(
      v.string(), // Could be more strict with model ID
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
)

// ===== Stream Chunk Validators =====
export const streamChunkValidator = v.object({
  id: chunkIdValidator,
  content: v.string(),
  timestamp: v.number(),
  sequence: v.optional(v.number()),
})

// ===== Branch Information Validator =====
export const branchInfoValidator = v.optional(
  v.object({
    threadId: v.id("threads"),
    messageId: v.id("messages"),
    timestamp: v.number(),
  }),
)

// ===== Share Settings Validator =====
export const shareSettingsValidator = v.optional(
  v.object({
    showThinking: v.optional(v.boolean()),
  }),
)

// ===== File Metadata Validator =====
export const fileMetadataValidator = v.optional(
  v.object({
    width: v.optional(v.number()), // For images
    height: v.optional(v.number()), // For images
    pages: v.optional(v.number()), // For PDFs
    extractedText: v.optional(v.string()), // For searchable content
  }),
)

// ===== User Settings Validators =====
export const userApiKeysValidator = v.optional(
  v.object({
    openai: v.optional(v.string()), // Encrypted
    anthropic: v.optional(v.string()), // Encrypted
    openrouter: v.optional(v.string()), // Encrypted
  }),
)

export const userPreferencesValidator = v.optional(
  v.object({
    defaultModel: v.optional(modelIdValidator),
    preferredProvider: v.optional(modelProviderValidator),
  }),
)

// ===== Helper function to validate with business logic =====
/**
 * Validates that a string matches the expected format and length
 * Use this in handlers for runtime validation beyond type checking
 */
export function validateNanoid(value: string, expectedLength = 21): boolean {
  const nanoidRegex = /^[A-Za-z0-9_-]+$/
  return value.length === expectedLength && nanoidRegex.test(value)
}

/**
 * Validates that a title doesn't exceed the maximum length
 */
export function validateTitle(title: string, maxLength = 80): boolean {
  return title.length > 0 && title.length <= maxLength
}

/**
 * Validates stream ID format
 */
export function validateStreamId(streamId: string): boolean {
  return streamId.startsWith("stream_") && streamId.split("_").length >= 3
}

/**
 * Validates chunk ID format
 */
export function validateChunkId(chunkId: string): boolean {
  return chunkId.startsWith("chunk_") && chunkId.split("_").length >= 3
}

/**
 * Validates API key format for different providers
 */
export function validateApiKey(
  key: string,
  provider: "openai" | "anthropic" | "openrouter",
): boolean {
  switch (provider) {
    case "openai":
      return key.startsWith("sk-")
    case "anthropic":
      return key.startsWith("sk-ant-")
    case "openrouter":
      return key.length > 0 // OpenRouter doesn't have a specific format
    default:
      return false
  }
}
