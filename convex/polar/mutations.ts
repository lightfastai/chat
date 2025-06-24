import { v } from "convex/values"
import { internalMutation, internalQuery, mutation } from "../_generated/server"
import { getCreditCost, getCreditsForPlan } from "./config"

// Internal query to get customer by user ID
export const internalGetCustomerByUserId = internalQuery({
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
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("polarCustomers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique()
  },
})

// Store customer record
export const storeCustomer = internalMutation({
  args: {
    userId: v.id("users"),
    polarCustomerId: v.string(),
    email: v.string(),
  },
  returns: v.id("polarCustomers"),
  handler: async (ctx, args) => {
    // Check if customer already exists
    const existing = await ctx.db
      .query("polarCustomers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        polarCustomerId: args.polarCustomerId,
        email: args.email,
        updatedAt: Date.now(),
      })
      return existing._id
    }

    return await ctx.db.insert("polarCustomers", {
      userId: args.userId,
      polarCustomerId: args.polarCustomerId,
      email: args.email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

// Create or update subscription
export const upsertSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    polarProductId: v.string(),
    planType: v.literal("starter"),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("incomplete"),
      v.literal("trialing"),
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  returns: v.id("polarSubscriptions"),
  handler: async (ctx, args) => {
    // Check if subscription exists
    const existing = await ctx.db
      .query("polarSubscriptions")
      .withIndex("by_polar_subscription", (q) =>
        q.eq("polarSubscriptionId", args.polarSubscriptionId),
      )
      .unique()

    const subscriptionData = {
      userId: args.userId,
      polarCustomerId: args.polarCustomerId,
      polarSubscriptionId: args.polarSubscriptionId,
      polarProductId: args.polarProductId,
      planType: args.planType,
      status: args.status,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      updatedAt: Date.now(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, subscriptionData)

      // If subscription became active, allocate credits
      if (existing.status !== "active" && args.status === "active") {
        // Allocate credits directly here
        const credits = getCreditsForPlan(args.planType)
        const now = Date.now()

        // Get or create credit balance
        const balance = await ctx.db
          .query("creditBalances")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .unique()

        if (balance) {
          await ctx.db.patch(balance._id, {
            balance: balance.balance + credits,
            monthlyAllocation: credits,
            allocatedAt: now,
            periodStart: now,
            periodEnd: now + 30 * 24 * 60 * 60 * 1000,
            periodUsage: 0,
            updatedAt: now,
          })
        } else {
          await ctx.db.insert("creditBalances", {
            userId: args.userId,
            balance: credits,
            monthlyAllocation: credits,
            allocatedAt: now,
            periodStart: now,
            periodEnd: now + 30 * 24 * 60 * 60 * 1000,
            periodUsage: 0,
            updatedAt: now,
          })
        }

        // Record transaction
        await ctx.db.insert("creditTransactions", {
          userId: args.userId,
          type: "allocation",
          amount: credits,
          balance: credits,
          description: `Monthly credit allocation for ${args.planType} plan`,
          createdAt: now,
        })
      }

      return existing._id
    }

    const id = await ctx.db.insert("polarSubscriptions", {
      ...subscriptionData,
      createdAt: Date.now(),
    })

    // Allocate initial credits for new active subscription
    if (args.status === "active") {
      const credits = getCreditsForPlan(args.planType)
      const now = Date.now()

      // Create credit balance
      await ctx.db.insert("creditBalances", {
        userId: args.userId,
        balance: credits,
        monthlyAllocation: credits,
        allocatedAt: now,
        periodStart: now,
        periodEnd: now + 30 * 24 * 60 * 60 * 1000,
        periodUsage: 0,
        updatedAt: now,
      })

      // Record transaction
      await ctx.db.insert("creditTransactions", {
        userId: args.userId,
        type: "allocation",
        amount: credits,
        balance: credits,
        description: `Monthly credit allocation for ${args.planType} plan`,
        createdAt: now,
      })
    }

    return id
  },
})

// Allocate monthly credits
export const allocateMonthlyCredits = internalMutation({
  args: {
    userId: v.id("users"),
    planType: v.literal("starter"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const credits = getCreditsForPlan(args.planType)
    const now = Date.now()

    // Get or create credit balance
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique()

    if (balance) {
      // Update existing balance
      await ctx.db.patch(balance._id, {
        balance: balance.balance + credits,
        monthlyAllocation: credits,
        allocatedAt: now,
        periodStart: now,
        periodEnd: now + 30 * 24 * 60 * 60 * 1000, // 30 days
        periodUsage: 0,
        updatedAt: now,
      })
    } else {
      // Create new balance
      await ctx.db.insert("creditBalances", {
        userId: args.userId,
        balance: credits,
        monthlyAllocation: credits,
        allocatedAt: now,
        periodStart: now,
        periodEnd: now + 30 * 24 * 60 * 60 * 1000,
        periodUsage: 0,
        updatedAt: now,
      })
    }

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      userId: args.userId,
      type: "allocation",
      amount: credits,
      balance: credits,
      description: `Monthly credit allocation for ${args.planType} plan`,
      createdAt: now,
    })
  },
})

// Consume credits for a message
export const consumeCredits = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
    messageId: v.id("messages"),
    model: v.string(),
    action: v.optional(
      v.union(
        v.literal("chat"),
        v.literal("computer_use"),
        v.literal("image_generation"),
        v.literal("file_analysis"),
      ),
    ),
  },
  returns: v.object({
    success: v.boolean(),
    creditsUsed: v.number(),
    remainingBalance: v.number(),
    insufficientCredits: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    // Get user's balance
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique()

    if (!balance || balance.balance <= 0) {
      return {
        success: false,
        creditsUsed: 0,
        remainingBalance: 0,
        insufficientCredits: true,
      }
    }

    // Calculate credit cost
    const creditCost = getCreditCost(args.model, args.action ?? "chat")

    // Check if user has enough credits
    if (balance.balance < creditCost) {
      return {
        success: false,
        creditsUsed: 0,
        remainingBalance: balance.balance,
        insufficientCredits: true,
      }
    }

    // Consume credits
    const newBalance = balance.balance - creditCost
    await ctx.db.patch(balance._id, {
      balance: newBalance,
      periodUsage: balance.periodUsage + creditCost,
      updatedAt: Date.now(),
    })

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      userId: args.userId,
      type: "usage",
      amount: -creditCost,
      balance: newBalance,
      threadId: args.threadId,
      messageId: args.messageId,
      model: args.model,
      action: args.action ?? "chat",
      description: `${args.model} ${args.action ?? "chat"} usage`,
      createdAt: Date.now(),
    })

    // Update daily analytics inline
    const today = new Date().toISOString().split("T")[0]
    const analytics = await ctx.db
      .query("usageAnalytics")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", today),
      )
      .unique()

    const modelCredits = {
      gpt4oCredits: 0,
      gpt4oMiniCredits: 0,
      claudeSonnetCredits: 0,
      claudeHaikuCredits: 0,
      computerUseCredits: 0,
    }

    if (args.action === "computer_use") {
      modelCredits.computerUseCredits = creditCost
    } else if (args.model.includes("gpt-4o-mini")) {
      modelCredits.gpt4oMiniCredits = creditCost
    } else if (args.model.includes("gpt-4o")) {
      modelCredits.gpt4oCredits = creditCost
    } else if (args.model.includes("claude") && args.model.includes("haiku")) {
      modelCredits.claudeHaikuCredits = creditCost
    } else if (args.model.includes("claude")) {
      modelCredits.claudeSonnetCredits = creditCost
    }

    if (analytics) {
      await ctx.db.patch(analytics._id, {
        gpt4oCredits: analytics.gpt4oCredits + modelCredits.gpt4oCredits,
        gpt4oMiniCredits:
          analytics.gpt4oMiniCredits + modelCredits.gpt4oMiniCredits,
        claudeSonnetCredits:
          analytics.claudeSonnetCredits + modelCredits.claudeSonnetCredits,
        claudeHaikuCredits:
          analytics.claudeHaikuCredits + modelCredits.claudeHaikuCredits,
        computerUseCredits:
          analytics.computerUseCredits + modelCredits.computerUseCredits,
        totalMessages: analytics.totalMessages + 1,
      })
    } else {
      await ctx.db.insert("usageAnalytics", {
        userId: args.userId,
        date: today,
        ...modelCredits,
        totalMessages: 1,
        totalThreads: 0,
        createdAt: Date.now(),
      })
    }

    return {
      success: true,
      creditsUsed: creditCost,
      remainingBalance: newBalance,
    }
  },
})

// Update usage analytics (internal)
export const updateUsageAnalytics = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    creditsUsed: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD

    // Find or create today's analytics
    const analytics = await ctx.db
      .query("usageAnalytics")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", today),
      )
      .unique()

    const modelCredits = {
      gpt4oCredits: 0,
      gpt4oMiniCredits: 0,
      claudeSonnetCredits: 0,
      claudeHaikuCredits: 0,
      computerUseCredits: 0,
    }

    // Map model to credit field
    if (args.model.includes("gpt-4o-mini")) {
      modelCredits.gpt4oMiniCredits = args.creditsUsed
    } else if (args.model.includes("gpt-4o")) {
      modelCredits.gpt4oCredits = args.creditsUsed
    } else if (args.model.includes("claude") && args.model.includes("haiku")) {
      modelCredits.claudeHaikuCredits = args.creditsUsed
    } else if (args.model.includes("claude")) {
      modelCredits.claudeSonnetCredits = args.creditsUsed
    }

    if (analytics) {
      await ctx.db.patch(analytics._id, {
        gpt4oCredits: analytics.gpt4oCredits + modelCredits.gpt4oCredits,
        gpt4oMiniCredits:
          analytics.gpt4oMiniCredits + modelCredits.gpt4oMiniCredits,
        claudeSonnetCredits:
          analytics.claudeSonnetCredits + modelCredits.claudeSonnetCredits,
        claudeHaikuCredits:
          analytics.claudeHaikuCredits + modelCredits.claudeHaikuCredits,
        computerUseCredits:
          analytics.computerUseCredits + modelCredits.computerUseCredits,
        totalMessages: analytics.totalMessages + 1,
      })
    } else {
      await ctx.db.insert("usageAnalytics", {
        userId: args.userId,
        date: today,
        ...modelCredits,
        totalMessages: 1,
        totalThreads: 0, // Will be updated separately
        createdAt: Date.now(),
      })
    }
  },
})
