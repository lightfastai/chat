import { internalQuery, query } from "../_generated/server"
import { v } from "convex/values"
import { getCreditCost } from "./config"

// Get customer by user ID
export const getCustomerByUserId = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("polarCustomers"),
      userId: v.id("users"),
      polarCustomerId: v.string(),
      email: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("polarCustomers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique()
  },
})

// Get active subscription for user
export const getActiveSubscription = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("polarSubscriptions"),
      planType: v.literal("starter"),
      status: v.string(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("polarSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .unique()

    if (!subscription) return null

    return {
      _id: subscription._id,
      planType: subscription.planType,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    }
  },
})

// Get credit balance for user
export const getCreditBalance = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.object({
    balance: v.number(),
    monthlyAllocation: v.number(),
    periodUsage: v.number(),
    periodEnd: v.number(),
  }),
  handler: async (ctx, args) => {
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique()

    if (!balance) {
      return {
        balance: 0,
        monthlyAllocation: 0,
        periodUsage: 0,
        periodEnd: Date.now(),
      }
    }

    return {
      balance: balance.balance,
      monthlyAllocation: balance.monthlyAllocation,
      periodUsage: balance.periodUsage,
      periodEnd: balance.periodEnd,
    }
  },
})

// Get recent credit transactions
export const getRecentTransactions = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("creditTransactions"),
      type: v.string(),
      amount: v.number(),
      balance: v.number(),
      description: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10
    
    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit)

    return transactions.map((tx) => ({
      _id: tx._id,
      type: tx.type,
      amount: tx.amount,
      balance: tx.balance,
      description: tx.description,
      createdAt: tx.createdAt,
    }))
  },
})

// Check if user has sufficient credits for a message
export const canSendMessage = query({
  args: {
    userId: v.id("users"),
    model: v.string(),
    action: v.optional(
      v.union(
        v.literal("chat"),
        v.literal("computer_use"),
        v.literal("image_generation"),
        v.literal("file_analysis")
      )
    ),
  },
  returns: v.object({
    canSend: v.boolean(),
    reason: v.optional(v.string()),
    creditsRequired: v.number(),
    currentBalance: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get user's credit balance
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique()

    if (!balance) {
      return {
        canSend: false,
        reason: "No credit balance found. Please subscribe to get credits.",
        creditsRequired: 0,
        currentBalance: 0,
      }
    }

    // Calculate credit cost
    const creditsRequired = getCreditCost(args.model, args.action ?? "chat")

    if (balance.balance < creditsRequired) {
      return {
        canSend: false,
        reason: `Insufficient credits. Need ${creditsRequired}, have ${balance.balance}`,
        creditsRequired,
        currentBalance: balance.balance,
      }
    }

    return {
      canSend: true,
      creditsRequired,
      currentBalance: balance.balance,
    }
  },
})

// Get usage analytics for date range
export const getUsageAnalytics = query({
  args: {
    userId: v.id("users"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
  },
  returns: v.array(
    v.object({
      date: v.string(),
      totalCredits: v.number(),
      messageCount: v.number(),
      threadCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const analytics = await ctx.db
      .query("usageAnalytics")
      .withIndex("by_user_and_date", (q) =>
        q
          .eq("userId", args.userId)
          .gte("date", args.startDate)
          .lte("date", args.endDate)
      )
      .collect()

    return analytics.map((a) => ({
      date: a.date,
      totalCredits:
        a.gpt4oCredits +
        a.gpt4oMiniCredits +
        a.claudeSonnetCredits +
        a.claudeHaikuCredits +
        a.computerUseCredits,
      messageCount: a.totalMessages,
      threadCount: a.totalThreads,
    }))
  },
})

