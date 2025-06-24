import { mutation, internalMutation } from "../_generated/server"
import { v } from "convex/values"
import { CREDIT_COSTS } from "./config"

// Consume credits for a message
export const consumeCredits = mutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    description: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    remainingCredits: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { userId, model, description }) => {
    // Get credit cost for model
    const creditCost = CREDIT_COSTS[model as keyof typeof CREDIT_COSTS] || 1

    // Get current balance
    const creditBalance = await ctx.db
      .query("creditBalances")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (!creditBalance) {
      return {
        success: false,
        remainingCredits: 0,
        error: "No credit balance found. Please subscribe to get credits.",
      }
    }

    // Check if user has enough credits
    if (creditBalance.balance < creditCost) {
      return {
        success: false,
        remainingCredits: creditBalance.balance,
        error: `Insufficient credits. Need ${creditCost} credits, have ${creditBalance.balance}.`,
      }
    }

    // Deduct credits
    const newBalance = creditBalance.balance - creditCost
    const newPeriodUsage = creditBalance.periodUsage + creditCost

    await ctx.db.patch(creditBalance._id, {
      balance: newBalance,
      periodUsage: newPeriodUsage,
      updatedAt: Date.now(),
    })

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      userId,
      type: "usage",
      amount: -creditCost,
      balance: newBalance,
      description,
      model,
      createdAt: Date.now(),
    })

    return {
      success: true,
      remainingCredits: newBalance,
    }
  },
})

// Check if user has enough credits for a model
export const checkCredits = mutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
  },
  returns: v.object({
    hasCredits: v.boolean(),
    remainingCredits: v.number(),
    requiredCredits: v.number(),
  }),
  handler: async (ctx, { userId, model }) => {
    const creditCost = CREDIT_COSTS[model as keyof typeof CREDIT_COSTS] || 1

    const creditBalance = await ctx.db
      .query("creditBalances")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (!creditBalance) {
      return {
        hasCredits: false,
        remainingCredits: 0,
        requiredCredits: creditCost,
      }
    }

    return {
      hasCredits: creditBalance.balance >= creditCost,
      remainingCredits: creditBalance.balance,
      requiredCredits: creditCost,
    }
  },
})

// Internal mutation to refund credits (for failed operations)
export const refundCredits = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, amount, description }) => {
    const creditBalance = await ctx.db
      .query("creditBalances")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first()

    if (!creditBalance) {
      console.warn(`No credit balance found for user ${userId} when refunding ${amount} credits`)
      return null
    }

    // Add credits back
    const newBalance = creditBalance.balance + amount
    const newPeriodUsage = Math.max(0, creditBalance.periodUsage - amount)

    await ctx.db.patch(creditBalance._id, {
      balance: newBalance,
      periodUsage: newPeriodUsage,
      updatedAt: Date.now(),
    })

    // Record refund transaction
    await ctx.db.insert("creditTransactions", {
      userId,
      type: "refund",
      amount: amount,
      balance: newBalance,
      description,
      createdAt: Date.now(),
    })

    console.log(`Refunded ${amount} credits to user ${userId}. New balance: ${newBalance}`)
    return null
  },
})

// Get usage statistics for a user
export const getUserUsageStats = mutation({
  args: {
    userId: v.id("users"),
    days: v.optional(v.number()),
  },
  returns: v.object({
    totalUsed: v.number(),
    usageByModel: v.record(v.string(), v.number()),
    dailyUsage: v.array(v.object({
      date: v.string(),
      credits: v.number(),
    })),
  }),
  handler: async (ctx, { userId, days = 30 }) => {
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000)

    // Get all usage transactions in the period
    const transactions = await ctx.db
      .query("creditTransactions")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("type"), "usage"),
          q.gte(q.field("createdAt"), startTime)
        )
      )
      .collect()

    // Calculate usage by model
    const usageByModel: Record<string, number> = {}
    let totalUsed = 0

    for (const transaction of transactions) {
      const credits = Math.abs(transaction.amount)
      totalUsed += credits

      if (transaction.model) {
        const model = transaction.model
        usageByModel[model] = (usageByModel[model] || 0) + credits
      }
    }

    // Calculate daily usage
    const dailyUsage: Record<string, number> = {}
    for (const transaction of transactions) {
      const date = new Date(transaction.createdAt).toISOString().split('T')[0]
      const credits = Math.abs(transaction.amount)
      dailyUsage[date] = (dailyUsage[date] || 0) + credits
    }

    const dailyUsageArray = Object.entries(dailyUsage)
      .map(([date, credits]) => ({ date, credits }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalUsed,
      usageByModel,
      dailyUsage: dailyUsageArray,
    }
  },
})