import { v } from "convex/values"
import type { Doc } from "../_generated/dataModel"
import { type DatabaseWriter, mutation } from "../_generated/server"

/**
 * Create a new webhook event for processing
 */
export const create = mutation({
  args: {
    webhookId: v.string(),
    eventType: v.string(),
    eventTimestamp: v.number(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const { webhookId, eventType, eventTimestamp, payload } = args

    // Check if webhook already exists (idempotency)
    const existing = await ctx.db
      .query("polarWebhooks")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
      .first()

    if (existing) {
      console.log(`Webhook ${webhookId} already exists, skipping creation`)
      return existing._id
    }

    // Create new webhook event
    const webhookDoc = await ctx.db.insert("polarWebhooks", {
      webhookId,
      eventType,
      eventTimestamp,
      payload,
      status: "pending",
      retryCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    console.log(`Created webhook ${webhookId} of type ${eventType}`)
    return webhookDoc
  },
})

/**
 * Process a checkout completed event
 */
export const processCheckoutCompleted = mutation({
  args: {
    webhookId: v.string(),
  },
  handler: async (ctx, { webhookId }) => {
    // Get webhook event
    const webhook = await ctx.db
      .query("polarWebhooks")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
      .first()

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`)
    }

    if (webhook.status !== "pending") {
      console.log(`Webhook ${webhookId} already processed`)
      return
    }

    // Update status to processing
    await ctx.db.patch(webhook._id, {
      status: "processing",
      updatedAt: Date.now(),
    })

    try {
      const checkout = webhook.payload.data

      // Extract customer info
      const customerEmail = checkout.customerEmail
      const customerId = checkout.customerId
      const externalCustomerId = checkout.customerExternalId

      if (!customerEmail || !customerId) {
        throw new Error("Missing customer information in checkout")
      }

      // Find user by email
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), customerEmail))
        .first()

      if (!user) {
        throw new Error(`User not found for email: ${customerEmail}`)
      }

      // Create or update Polar customer record
      const existingCustomer = await ctx.db
        .query("polarCustomers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first()

      if (!existingCustomer) {
        await ctx.db.insert("polarCustomers", {
          userId: user._id,
          polarCustomerId: customerId,
          polarCustomerExternalId: externalCustomerId,
          email: customerEmail,
          name: checkout.customerName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: checkout.customerMetadata,
        })
      } else {
        await ctx.db.patch(existingCustomer._id, {
          polarCustomerId: customerId,
          polarCustomerExternalId: externalCustomerId,
          updatedAt: Date.now(),
        })
      }

      // Mark webhook as completed
      await ctx.db.patch(webhook._id, {
        status: "completed",
        processedAt: Date.now(),
        updatedAt: Date.now(),
      })

      console.log(
        `Successfully processed checkout ${checkout.id} for user ${user._id}`,
      )
    } catch (error) {
      // Mark webhook as failed
      await ctx.db.patch(webhook._id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        retryCount: webhook.retryCount + 1,
        updatedAt: Date.now(),
      })

      throw error
    }
  },
})

/**
 * Process subscription created/updated events
 */
export const processSubscriptionUpdate = mutation({
  args: {
    webhookId: v.string(),
  },
  handler: async (ctx, { webhookId }) => {
    // Get webhook event
    const webhook = await ctx.db
      .query("polarWebhooks")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
      .first()

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`)
    }

    if (webhook.status !== "pending") {
      console.log(`Webhook ${webhookId} already processed`)
      return
    }

    // Update status to processing
    await ctx.db.patch(webhook._id, {
      status: "processing",
      updatedAt: Date.now(),
    })

    try {
      const subscription = webhook.payload.data

      // Find customer
      const customer = await ctx.db
        .query("polarCustomers")
        .withIndex("by_polar_id", (q) =>
          q.eq("polarCustomerId", subscription.customerId),
        )
        .first()

      if (!customer) {
        throw new Error(`Customer not found for ID: ${subscription.customerId}`)
      }

      // Check if subscription already exists
      const existing = await ctx.db
        .query("polarSubscriptions")
        .withIndex("by_polar_subscription", (q) =>
          q.eq("polarSubscriptionId", subscription.id),
        )
        .first()

      const subscriptionData = {
        userId: customer.userId,
        polarCustomerId: subscription.customerId,
        polarSubscriptionId: subscription.id,
        polarProductId: subscription.productId,
        polarPriceId: subscription.priceId,
        status: subscription.status,
        startedAt: Date.parse(subscription.startedAt),
        endedAt: subscription.endedAt
          ? Date.parse(subscription.endedAt)
          : undefined,
        canceledAt: subscription.canceledAt
          ? Date.parse(subscription.canceledAt)
          : undefined,
        trialStartedAt: subscription.trialStartedAt
          ? Date.parse(subscription.trialStartedAt)
          : undefined,
        trialEndedAt: subscription.trialEndedAt
          ? Date.parse(subscription.trialEndedAt)
          : undefined,
        currentPeriodStart: Date.parse(subscription.currentPeriodStart),
        currentPeriodEnd: Date.parse(subscription.currentPeriodEnd),
        recurringInterval: subscription.recurringInterval,
        amount: subscription.amount,
        currency: subscription.currency,
        hasUsageBasedPricing: subscription.price?.type === "usage_based",
        metadata: subscription.metadata,
        updatedAt: Date.now(),
      }

      if (existing) {
        await ctx.db.patch(existing._id, subscriptionData)
      } else {
        await ctx.db.insert("polarSubscriptions", {
          ...subscriptionData,
          createdAt: Date.now(),
        })
      }

      // Update usage limits for the user
      await updateUsageLimits(ctx, customer.userId, subscription)

      // Mark webhook as completed
      await ctx.db.patch(webhook._id, {
        status: "completed",
        processedAt: Date.now(),
        updatedAt: Date.now(),
      })

      console.log(
        `Successfully processed subscription ${subscription.id} for user ${customer.userId}`,
      )
    } catch (error) {
      // Mark webhook as failed
      await ctx.db.patch(webhook._id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        retryCount: webhook.retryCount + 1,
        updatedAt: Date.now(),
      })

      throw error
    }
  },
})

/**
 * Process subscription canceled events
 */
export const processSubscriptionCanceled = mutation({
  args: {
    webhookId: v.string(),
  },
  handler: async (ctx, { webhookId }) => {
    // Get webhook event
    const webhook = await ctx.db
      .query("polarWebhooks")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
      .first()

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`)
    }

    if (webhook.status !== "pending") {
      console.log(`Webhook ${webhookId} already processed`)
      return
    }

    // Update status to processing
    await ctx.db.patch(webhook._id, {
      status: "processing",
      updatedAt: Date.now(),
    })

    try {
      const subscription = webhook.payload.data

      // Find existing subscription
      const existing = await ctx.db
        .query("polarSubscriptions")
        .withIndex("by_polar_subscription", (q) =>
          q.eq("polarSubscriptionId", subscription.id),
        )
        .first()

      if (!existing) {
        throw new Error(`Subscription not found: ${subscription.id}`)
      }

      // Update subscription status
      await ctx.db.patch(existing._id, {
        status: "canceled",
        canceledAt: Date.parse(subscription.canceledAt),
        endedAt: subscription.endedAt
          ? Date.parse(subscription.endedAt)
          : undefined,
        updatedAt: Date.now(),
      })

      // Mark webhook as completed
      await ctx.db.patch(webhook._id, {
        status: "completed",
        processedAt: Date.now(),
        updatedAt: Date.now(),
      })

      console.log(`Successfully canceled subscription ${subscription.id}`)
    } catch (error) {
      // Mark webhook as failed
      await ctx.db.patch(webhook._id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        retryCount: webhook.retryCount + 1,
        updatedAt: Date.now(),
      })

      throw error
    }
  },
})

/**
 * Process meter credit events
 */
export const processMeterCredit = mutation({
  args: {
    webhookId: v.string(),
  },
  handler: async (ctx, { webhookId }) => {
    // Get webhook event
    const webhook = await ctx.db
      .query("polarWebhooks")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
      .first()

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`)
    }

    if (webhook.status !== "pending") {
      console.log(`Webhook ${webhookId} already processed`)
      return
    }

    // Update status to processing
    await ctx.db.patch(webhook._id, {
      status: "processing",
      updatedAt: Date.now(),
    })

    try {
      const credit = webhook.payload.data

      // TODO: Implement meter credit processing
      // This would update user's available credits/usage limits

      console.log("Meter credit received:", credit)

      // Mark webhook as completed
      await ctx.db.patch(webhook._id, {
        status: "completed",
        processedAt: Date.now(),
        updatedAt: Date.now(),
      })
    } catch (error) {
      // Mark webhook as failed
      await ctx.db.patch(webhook._id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        retryCount: webhook.retryCount + 1,
        updatedAt: Date.now(),
      })

      throw error
    }
  },
})

/**
 * Process payment failed events
 */
export const processPaymentFailed = mutation({
  args: {
    webhookId: v.string(),
  },
  handler: async (ctx, { webhookId }) => {
    // Get webhook event
    const webhook = await ctx.db
      .query("polarWebhooks")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
      .first()

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`)
    }

    if (webhook.status !== "pending") {
      console.log(`Webhook ${webhookId} already processed`)
      return
    }

    // Update status to processing
    await ctx.db.patch(webhook._id, {
      status: "processing",
      updatedAt: Date.now(),
    })

    try {
      const payment = webhook.payload.data

      // TODO: Implement payment failed handling
      // This might involve:
      // - Updating subscription status to past_due
      // - Sending notification to user
      // - Starting grace period

      console.log("Payment failed:", payment)

      // Mark webhook as completed
      await ctx.db.patch(webhook._id, {
        status: "completed",
        processedAt: Date.now(),
        updatedAt: Date.now(),
      })
    } catch (error) {
      // Mark webhook as failed
      await ctx.db.patch(webhook._id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        retryCount: webhook.retryCount + 1,
        updatedAt: Date.now(),
      })

      throw error
    }
  },
})

/**
 * Mark webhook as processed (for unhandled event types)
 */
export const markProcessed = mutation({
  args: {
    webhookId: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { webhookId, status, error }) => {
    const webhook = await ctx.db
      .query("polarWebhooks")
      .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
      .first()

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`)
    }

    await ctx.db.patch(webhook._id, {
      status,
      error,
      processedAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

/**
 * Helper function to update usage limits based on subscription
 */
async function updateUsageLimits(
  ctx: { db: DatabaseWriter },
  userId: Doc<"users">["_id"],
  subscription: {
    productId: string
    id: string
    currentPeriodStart: string
    currentPeriodEnd: string
    recurringInterval: string
  },
) {
  // Get product features based on product ID
  // In a real implementation, this would fetch from Polar or use a mapping
  const productFeatures = getProductFeatures(subscription.productId)

  if (!productFeatures) {
    console.warn(`Unknown product ID: ${subscription.productId}`)
    return
  }

  // Calculate period dates
  const now = Date.now()
  const periodStart = Date.parse(subscription.currentPeriodStart)
  const periodEnd = Date.parse(subscription.currentPeriodEnd)

  // Check if usage limit record exists
  const existing = await ctx.db
    .query("usageLimits")
    .withIndex("by_user_period", (q) =>
      q
        .eq("userId", userId)
        .eq("periodStart", periodStart)
        .eq("periodEnd", periodEnd),
    )
    .first()

  const limitData = {
    userId,
    polarSubscriptionId: subscription.id,
    periodStart,
    periodEnd,
    periodType: (subscription.recurringInterval === "year"
      ? "year"
      : "month") as "year" | "month",
    limits: {
      tokensPerMonth: productFeatures.maxTokensPerMonth ?? undefined,
      threadsPerMonth: productFeatures.maxThreadsPerMonth ?? undefined,
      messagesPerDay: productFeatures.maxMessagesPerDay ?? undefined,
    },
    usage: existing?.usage || {
      tokensUsed: 0,
      threadsCreated: 0,
      messagesSent: 0,
    },
    isOverLimit: false,
    warningThreshold: 0.8,
    hasWarned: false,
    updatedAt: now,
  }

  if (existing) {
    await ctx.db.patch(existing._id, limitData)
  } else {
    await ctx.db.insert("usageLimits", limitData)
  }
}

/**
 * Get product features (mock implementation)
 * In production, this would fetch from Polar or use a configuration
 */
function getProductFeatures(productId: string) {
  // This is a placeholder - would be replaced with actual product mapping
  const productMap: Record<
    string,
    {
      maxTokensPerMonth: number | null
      maxThreadsPerMonth: number | null
      maxMessagesPerDay: number | null
    }
  > = {
    // Free tier
    prod_free: {
      maxTokensPerMonth: 100_000,
      maxThreadsPerMonth: 50,
      maxMessagesPerDay: 100,
    },
    // Pro tier
    prod_pro: {
      maxTokensPerMonth: 1_000_000,
      maxThreadsPerMonth: null,
      maxMessagesPerDay: 1_000,
    },
    // Team tier
    prod_team: {
      maxTokensPerMonth: null,
      maxThreadsPerMonth: null,
      maxMessagesPerDay: null,
    },
  }

  return productMap[productId]
}
