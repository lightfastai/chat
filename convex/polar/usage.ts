import { v } from "convex/values"
import { nanoid } from "nanoid"
import type { Id } from "../_generated/dataModel"
import { mutation, query, type DatabaseReader, type DatabaseWriter } from "../_generated/server"

/**
 * Track AI usage event for a user
 * Called after each AI response to record token usage
 */
export const trackUsage = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
    messageId: v.id("messages"),
    model: v.string(),
    provider: v.string(),
    usage: v.object({
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      totalTokens: v.optional(v.number()),
      reasoningTokens: v.optional(v.number()),
      cachedInputTokens: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, threadId, messageId, model, provider, usage } = args

    // Check if user has a Polar customer record
    const customer = await ctx.db
      .query("polarCustomers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    // Create usage event
    const eventId = nanoid()
    await ctx.db.insert("usageEvents", {
      userId,
      polarCustomerId: customer?.polarCustomerId,
      eventName: "ai_usage",
      eventId,
      timestamp: Date.now(),
      properties: {
        model,
        provider,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        reasoningTokens: usage.reasoningTokens,
        cachedInputTokens: usage.cachedInputTokens,
        threadId,
        messageId,
      },
      syncedToPolar: false,
    })

    // Update usage limits if user has a subscription
    if (customer) {
      await updateUsageLimits(ctx, userId, usage.totalTokens || 0)
    }
  },
})

/**
 * Check if user is within their usage limits
 */
export const checkLimits = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Get current period usage limits
    const now = Date.now()
    const limits = await ctx.db
      .query("usageLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now),
        ),
      )
      .first()

    if (!limits) {
      // No subscription - check free tier limits
      const usage = await calculateFreeUsage(ctx, userId)
      return {
        hasSubscription: false,
        isOverLimit: usage.tokensUsed > 100_000, // Free tier limit
        limits: {
          tokensPerMonth: 100_000,
          threadsPerMonth: 50,
          messagesPerDay: 100,
        },
        usage,
        percentUsed: {
          tokens: (usage.tokensUsed / 100_000) * 100,
          threads: (usage.threadsCreated / 50) * 100,
          messages: (usage.messagesSent / 100) * 100,
        },
      }
    }

    // Calculate percentage used
    const percentUsed = {
      tokens: limits.limits.tokensPerMonth
        ? (limits.usage.tokensUsed / limits.limits.tokensPerMonth) * 100
        : 0,
      threads: limits.limits.threadsPerMonth
        ? (limits.usage.threadsCreated / limits.limits.threadsPerMonth) * 100
        : 0,
      messages: limits.limits.messagesPerDay
        ? (limits.usage.messagesSent / limits.limits.messagesPerDay) * 100
        : 0,
    }

    return {
      hasSubscription: true,
      isOverLimit: limits.isOverLimit,
      limits: limits.limits,
      usage: limits.usage,
      percentUsed,
      warningThreshold: limits.warningThreshold,
      hasWarned: limits.hasWarned,
    }
  },
})

/**
 * Get user's subscription status
 */
export const getSubscriptionStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Check if user has a Polar customer record
    const customer = await ctx.db
      .query("polarCustomers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()

    if (!customer) {
      return {
        hasCustomer: false,
        hasActiveSubscription: false,
        subscription: null,
      }
    }

    // Get active subscription
    const subscription = await ctx.db
      .query("polarSubscriptions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active"),
      )
      .first()

    return {
      hasCustomer: true,
      hasActiveSubscription: !!subscription,
      subscription,
      customerId: customer.polarCustomerId,
    }
  },
})

/**
 * Batch sync usage events to Polar
 * This would be called by a cron job
 */
export const syncUsageEvents = mutation({
  args: {},
  handler: async (ctx) => {
    // Get unsynced events (limit to 100 per batch)
    const events = await ctx.db
      .query("usageEvents")
      .withIndex("by_sync_status", (q) => q.eq("syncedToPolar", false))
      .take(100)

    if (events.length === 0) {
      return { synced: 0 }
    }

    // Group events by customer ID
    const eventsByCustomer = new Map<string, typeof events>()
    for (const event of events) {
      if (!event.polarCustomerId) continue

      const customerId = event.polarCustomerId
      if (!eventsByCustomer.has(customerId)) {
        eventsByCustomer.set(customerId, [])
      }
      eventsByCustomer.get(customerId)!.push(event)
    }

    // Create batch ID
    const batchId = nanoid()

    // Mark events as part of this batch
    for (const event of events) {
      await ctx.db.patch(event._id, {
        batchId,
      })
    }

    // In a real implementation, this would call the Polar API
    // For now, we'll just mark them as synced
    console.log(
      `Would sync ${events.length} events to Polar in batch ${batchId}`,
    )

    // Mark events as synced
    for (const event of events) {
      await ctx.db.patch(event._id, {
        syncedToPolar: true,
        syncedAt: Date.now(),
      })
    }

    return { synced: events.length, batchId }
  },
})

/**
 * Helper to update usage limits
 */
async function updateUsageLimits(
  ctx: { db: DatabaseWriter },
  userId: Id<"users">,
  tokensUsed: number,
) {
  const now = Date.now()

  // Get current period limits
  const limits = await ctx.db
    .query("usageLimits")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) =>
      q.and(
        q.lte(q.field("periodStart"), now),
        q.gte(q.field("periodEnd"), now),
      ),
    )
    .first()

  if (!limits) {
    console.warn(`No usage limits found for user ${userId}`)
    return
  }

  // Update token usage
  const newTokensUsed = limits.usage.tokensUsed + tokensUsed
  const isOverLimit = limits.limits.tokensPerMonth
    ? newTokensUsed > limits.limits.tokensPerMonth
    : false

  await ctx.db.patch(limits._id, {
    usage: {
      ...limits.usage,
      tokensUsed: newTokensUsed,
    },
    isOverLimit,
    updatedAt: now,
  })

  // Check if we should send a warning
  if (
    !limits.hasWarned &&
    limits.limits.tokensPerMonth &&
    limits.warningThreshold &&
    newTokensUsed >= limits.limits.tokensPerMonth * limits.warningThreshold
  ) {
    await ctx.db.patch(limits._id, {
      hasWarned: true,
    })

    // TODO: Send notification to user about approaching limit
    console.log(
      `User ${userId} has reached ${limits.warningThreshold * 100}% of token limit`,
    )
  }
}

/**
 * Calculate free tier usage for users without subscription
 */
async function calculateFreeUsage(ctx: { db: DatabaseReader }, userId: Id<"users">) {
  const now = Date.now()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)

  // Count tokens used this month
  const monthlyEvents = await ctx.db
    .query("usageEvents")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.gte(q.field("timestamp"), monthStart.getTime()))
    .collect()

  const tokensUsed = monthlyEvents.reduce((sum, event) => {
    return sum + (event.properties.totalTokens || 0)
  }, 0)

  // Count threads created this month
  const threadsCreated = await ctx.db
    .query("threads")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.gte(q.field("createdAt"), monthStart.getTime()))
    .collect()

  // Count messages sent today
  const messagesSent = await ctx.db
    .query("messages")
    .filter((q) =>
      q.and(
        q.eq(q.field("messageType"), "user"),
        q.gte(q.field("timestamp"), dayStart.getTime()),
      ),
    )
    .collect()

  // Filter messages by user's threads
  const userThreadIds = new Set(threadsCreated.map((t) => t._id))
  const userMessages = messagesSent.filter((m) => userThreadIds.has(m.threadId))

  return {
    tokensUsed,
    threadsCreated: threadsCreated.length,
    messagesSent: userMessages.length,
  }
}
