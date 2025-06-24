import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import {
  branchInfoValidator,
  chunkIdValidator,
  clientIdValidator,
  commentValidator,
  feedbackRatingValidator,
  feedbackReasonsValidator,
  fileMetadataValidator,
  fileNameValidator,
  ipHashValidator,
  messageTypeValidator,
  mimeTypeValidator,
  modelIdValidator,
  modelProviderValidator,
  shareIdValidator,
  shareSettingsValidator,
  storageIdValidator,
  streamChunkValidator,
  streamIdValidator,
  threadUsageValidator,
  titleValidator,
  tokenUsageValidator,
  userAgentValidator,
  userApiKeysValidator,
  userPreferencesValidator,
} from "./validators.js"

export default defineSchema({
  ...authTables,

  // File storage for attachments
  files: defineTable({
    storageId: storageIdValidator, // Convex storage ID
    fileName: fileNameValidator,
    fileType: mimeTypeValidator, // MIME type
    fileSize: v.number(), // Size in bytes
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    // Optional metadata
    metadata: fileMetadataValidator,
  })
    .index("by_user", ["uploadedBy"])
    .index("by_storage_id", ["storageId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    apiKeys: userApiKeysValidator,
    preferences: userPreferencesValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  threads: defineTable({
    clientId: v.optional(clientIdValidator), // Client-generated ID for instant navigation
    title: titleValidator,
    userId: v.id("users"),
    createdAt: v.number(),
    lastMessageAt: v.number(),
    isTitleGenerating: v.optional(v.boolean()),
    isGenerating: v.optional(v.boolean()),
    pinned: v.optional(v.boolean()),
    // Branch information
    branchedFrom: branchInfoValidator,
    // Share functionality
    isPublic: v.optional(v.boolean()), // Whether the thread is publicly accessible
    shareId: v.optional(shareIdValidator), // Unique ID for share links
    sharedAt: v.optional(v.number()), // Timestamp when first shared
    shareSettings: shareSettingsValidator,
    // Thread-level usage tracking (denormalized for performance)
    usage: threadUsageValidator,
  })
    .index("by_user", ["userId"])
    .index("by_client_id", ["clientId"])
    .index("by_user_client", ["userId", "clientId"])
    .index("by_share_id", ["shareId"]),

  messages: defineTable({
    threadId: v.id("threads"),
    body: v.string(),
    timestamp: v.number(),
    messageType: messageTypeValidator,
    model: v.optional(modelProviderValidator),
    modelId: v.optional(modelIdValidator),
    // Attachments - array of file IDs
    attachments: v.optional(v.array(v.id("files"))),
    isStreaming: v.optional(v.boolean()),
    streamId: v.optional(streamIdValidator),
    isComplete: v.optional(v.boolean()),
    thinkingStartedAt: v.optional(v.number()),
    thinkingCompletedAt: v.optional(v.number()),
    usedUserApiKey: v.optional(v.boolean()), // Track if user's own API key was used
    streamChunks: v.optional(v.array(streamChunkValidator)),
    lastChunkId: v.optional(chunkIdValidator),
    streamVersion: v.optional(v.number()),
    thinkingContent: v.optional(v.string()),
    isThinking: v.optional(v.boolean()),
    hasThinkingContent: v.optional(v.boolean()),
    // Token usage tracking per message
    usage: tokenUsageValidator,
  })
    .index("by_thread", ["threadId"])
    .index("by_stream_id", ["streamId"]),

  feedback: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    threadId: v.id("threads"),
    rating: feedbackRatingValidator,
    comment: commentValidator,
    reasons: feedbackReasonsValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_user_message", ["userId", "messageId"])
    .index("by_thread", ["threadId"]),

  shareAccess: defineTable({
    shareId: shareIdValidator,
    accessedAt: v.number(),
    ipHash: ipHashValidator, // Hashed IP for rate limiting
    userAgent: userAgentValidator,
    success: v.boolean(), // Whether the access was successful
  })
    .index("by_share_id", ["shareId"])
    .index("by_share_time", ["shareId", "accessedAt"])
    .index("by_ip_time", ["ipHash", "accessedAt"]),

  // === POLAR INTEGRATION TABLES ===

  // Polar customer records
  polarCustomers: defineTable({
    userId: v.id("users"),
    polarCustomerId: v.string(), // Polar's customer ID
    email: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_polar_id", ["polarCustomerId"]),

  // Polar subscriptions
  polarSubscriptions: defineTable({
    userId: v.id("users"),
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    polarProductId: v.string(),

    // Plan details
    planType: v.literal("starter"), // $8/month - 800 credits

    // Subscription status
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("incomplete"),
      v.literal("trialing"),
    ),

    // Billing details
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_polar_subscription", ["polarSubscriptionId"])
    .index("by_status", ["status"]),

  // Credit balances and tracking
  creditBalances: defineTable({
    userId: v.id("users"),

    // Current balance
    balance: v.number(), // Current credit balance

    // Monthly allocation tracking
    monthlyAllocation: v.number(), // Credits allocated this month
    allocatedAt: v.number(), // When credits were last allocated

    // Usage tracking for current period
    periodStart: v.number(),
    periodEnd: v.number(),
    periodUsage: v.number(), // Credits used in current period

    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Credit transactions (purchases, usage, refunds)
  creditTransactions: defineTable({
    userId: v.id("users"),

    type: v.union(
      v.literal("allocation"), // Monthly credit allocation
      v.literal("purchase"), // One-time credit purchase
      v.literal("usage"), // Credit consumption
      v.literal("refund"), // Credit refund
      v.literal("adjustment"), // Manual adjustment
    ),

    amount: v.number(), // Positive for credits, negative for usage
    balance: v.number(), // Balance after transaction

    // Usage details
    threadId: v.optional(v.id("threads")),
    messageId: v.optional(v.id("messages")),
    model: v.optional(v.string()),
    action: v.optional(v.string()), // e.g., "chat", "computer_use"

    // Purchase/allocation details
    polarPaymentId: v.optional(v.string()),
    description: v.string(),

    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "type"])
    .index("by_thread", ["threadId"]),

  // Usage analytics (aggregated daily)
  usageAnalytics: defineTable({
    userId: v.id("users"),

    date: v.string(), // YYYY-MM-DD format

    // Credit usage by model
    gpt4oCredits: v.number(),
    gpt4oMiniCredits: v.number(),
    claudeSonnetCredits: v.number(),
    claudeHaikuCredits: v.number(),
    computerUseCredits: v.number(),

    // Message counts
    totalMessages: v.number(),
    totalThreads: v.number(),

    createdAt: v.number(),
  }).index("by_user_and_date", ["userId", "date"]),

  // Webhook events from Polar
  polarWebhookEvents: defineTable({
    polarEventId: v.string(),
    eventType: v.string(),
    processed: v.boolean(),
    payload: v.any(), // JSON payload from Polar

    // Processing details
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_polar_event", ["polarEventId"])
    .index("by_processed", ["processed"]),
})
