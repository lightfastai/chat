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

  // ============================================================================
  // POLAR.SH INTEGRATION TABLES
  // ============================================================================

  /**
   * Stores Polar customer data synchronized from Polar.sh
   * Links our users to Polar customer records
   */
  polarCustomers: defineTable({
    userId: v.id("users"), // Our user ID
    polarCustomerId: v.string(), // Polar's customer ID
    polarCustomerExternalId: v.optional(v.string()), // External ID if we set one
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Metadata from Polar
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_polar_id", ["polarCustomerId"])
    .index("by_external_id", ["polarCustomerExternalId"]),

  /**
   * Stores active subscriptions from Polar
   * Tracks subscription status and billing details
   */
  polarSubscriptions: defineTable({
    userId: v.id("users"),
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    polarProductId: v.string(),
    polarPriceId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("expired"),
      v.literal("unpaid"),
    ),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    trialStartedAt: v.optional(v.number()),
    trialEndedAt: v.optional(v.number()),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    // Subscription details
    recurringInterval: v.union(v.literal("month"), v.literal("year")),
    amount: v.number(), // Amount in cents
    currency: v.string(),
    // Usage-based billing specific
    hasUsageBasedPricing: v.optional(v.boolean()),
    // Metadata
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_polar_subscription", ["polarSubscriptionId"])
    .index("by_polar_customer", ["polarCustomerId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  /**
   * Tracks usage events that will be sent to Polar
   * These are aggregated and sent in batches
   */
  usageEvents: defineTable({
    userId: v.id("users"),
    polarCustomerId: v.optional(v.string()), // Set when user has subscription
    eventName: v.string(), // e.g., "ai_usage"
    eventId: v.string(), // Unique ID for deduplication
    timestamp: v.number(),
    // Event properties
    properties: v.object({
      model: v.optional(v.string()),
      provider: v.optional(v.string()),
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      totalTokens: v.optional(v.number()),
      reasoningTokens: v.optional(v.number()),
      cachedInputTokens: v.optional(v.number()),
      threadId: v.optional(v.id("threads")),
      messageId: v.optional(v.id("messages")),
    }),
    // Sync status
    syncedToPolar: v.boolean(),
    syncedAt: v.optional(v.number()),
    syncError: v.optional(v.string()),
    // Batching
    batchId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_sync_status", ["syncedToPolar", "timestamp"])
    .index("by_event_id", ["eventId"])
    .index("by_batch", ["batchId"])
    .index("by_polar_customer", ["polarCustomerId"]),

  /**
   * Stores webhook events from Polar for processing
   * Ensures idempotent processing of webhooks
   */
  polarWebhooks: defineTable({
    webhookId: v.string(), // Polar's webhook ID for deduplication
    eventType: v.string(), // e.g., "subscription.created", "checkout.completed"
    eventTimestamp: v.number(),
    payload: v.any(), // Full webhook payload
    // Processing status
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    retryCount: v.number(),
    // Audit trail
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_webhook_id", ["webhookId"])
    .index("by_status", ["status"])
    .index("by_event_type", ["eventType"])
    .index("by_created", ["createdAt"]),

  /**
   * Tracks user usage limits and current consumption
   * Cached calculations for fast limit checking
   */
  usageLimits: defineTable({
    userId: v.id("users"),
    polarSubscriptionId: v.optional(v.string()),
    // Current period
    periodStart: v.number(),
    periodEnd: v.number(),
    periodType: v.union(
      v.literal("day"),
      v.literal("month"),
      v.literal("year"),
    ),
    // Limits (from product features)
    limits: v.object({
      tokensPerMonth: v.optional(v.number()),
      threadsPerMonth: v.optional(v.number()),
      messagesPerDay: v.optional(v.number()),
    }),
    // Current usage
    usage: v.object({
      tokensUsed: v.number(),
      threadsCreated: v.number(),
      messagesSent: v.number(),
      // Breakdown by model
      tokensByModel: v.optional(v.record(v.string(), v.number())),
    }),
    // Status
    isOverLimit: v.boolean(),
    warningThreshold: v.optional(v.number()), // e.g., 0.8 for 80% warning
    hasWarned: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_period", ["userId", "periodStart", "periodEnd"])
    .index("by_subscription", ["polarSubscriptionId"]),
})
