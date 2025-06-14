import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

// Model ID validator for type safety
const modelIdValidator = v.union(
  // OpenAI models
  v.literal("gpt-4o-mini"),
  v.literal("gpt-4o"),
  v.literal("gpt-3.5-turbo"),
  // Anthropic models
  v.literal("claude-sonnet-4-20250514"),
  v.literal("claude-sonnet-4-20250514-thinking"),
  v.literal("claude-3-5-sonnet-20241022"),
  v.literal("claude-3-haiku-20240307"),
  // OpenRouter models
  v.literal("meta-llama/llama-3.3-70b-instruct"),
  v.literal("anthropic/claude-3.5-sonnet"),
  v.literal("openai/gpt-4o"),
  v.literal("google/gemini-pro-1.5"),
  v.literal("mistralai/mistral-large"),
)

const modelProviderValidator = v.union(
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("openrouter"),
)

export default defineSchema({
  ...authTables,

  // File storage for attachments
  files: defineTable({
    storageId: v.string(), // Convex storage ID
    fileName: v.string(),
    fileType: v.string(), // MIME type
    fileSize: v.number(), // Size in bytes
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    // Optional metadata
    metadata: v.optional(
      v.object({
        width: v.optional(v.number()), // For images
        height: v.optional(v.number()), // For images
        pages: v.optional(v.number()), // For PDFs
        extractedText: v.optional(v.string()), // For searchable content
      }),
    ),
  })
    .index("by_user", ["uploadedBy"])
    .index("by_storage_id", ["storageId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    apiKeys: v.optional(
      v.object({
        openai: v.optional(v.string()), // Encrypted API key
        anthropic: v.optional(v.string()), // Encrypted API key
        openrouter: v.optional(v.string()), // Encrypted API key
      }),
    ),
    preferences: v.optional(
      v.object({
        defaultModel: v.optional(modelIdValidator),
        preferredProvider: v.optional(modelProviderValidator),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  threads: defineTable({
    clientId: v.optional(v.string()), // Client-generated ID for instant navigation
    title: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    lastMessageAt: v.number(),
    isTitleGenerating: v.optional(v.boolean()),
    isGenerating: v.optional(v.boolean()),
    pinned: v.optional(v.boolean()),
    // Thread-level usage tracking (denormalized for performance)
    usage: v.optional(
      v.object({
        totalInputTokens: v.number(),
        totalOutputTokens: v.number(),
        totalTokens: v.number(),
        totalReasoningTokens: v.number(),
        totalCachedInputTokens: v.number(),
        messageCount: v.number(),
        // Dynamic model tracking - scales to any number of models/providers
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
  })
    .index("by_user", ["userId"])
    .index("by_client_id", ["clientId"])
    .index("by_user_client", ["userId", "clientId"]),

  messages: defineTable({
    threadId: v.id("threads"),
    body: v.string(),
    timestamp: v.number(),
    messageType: v.union(v.literal("user"), v.literal("assistant")),
    model: v.optional(modelProviderValidator),
    modelId: v.optional(modelIdValidator),
    // Attachments - array of file IDs
    attachments: v.optional(v.array(v.id("files"))),
    isStreaming: v.optional(v.boolean()),
    streamId: v.optional(v.string()),
    isComplete: v.optional(v.boolean()),
    thinkingStartedAt: v.optional(v.number()),
    thinkingCompletedAt: v.optional(v.number()),
    usedUserApiKey: v.optional(v.boolean()), // Track if user's own API key was used
    streamChunks: v.optional(
      v.array(
        v.object({
          id: v.string(),
          content: v.string(),
          timestamp: v.number(),
          sequence: v.optional(v.number()), // Add sequence for chunk ordering
        }),
      ),
    ),
    lastChunkId: v.optional(v.string()),
    streamVersion: v.optional(v.number()),
    thinkingContent: v.optional(v.string()),
    isThinking: v.optional(v.boolean()),
    hasThinkingContent: v.optional(v.boolean()),
    // Token usage tracking per message
    usage: v.optional(
      v.object({
        inputTokens: v.optional(v.number()),
        outputTokens: v.optional(v.number()),
        totalTokens: v.optional(v.number()),
        reasoningTokens: v.optional(v.number()),
        cachedInputTokens: v.optional(v.number()),
      }),
    ),
  })
    .index("by_thread", ["threadId"])
    .index("by_stream_id", ["streamId"]),

  feedback: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    threadId: v.id("threads"),
    rating: v.union(v.literal("positive"), v.literal("negative")),
    comment: v.optional(v.string()),
    reasons: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_user_message", ["userId", "messageId"])
    .index("by_thread", ["threadId"]),
})
