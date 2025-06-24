import { httpAction, internalMutation } from "../_generated/server"
import { v } from "convex/values"

// Polar webhook event types
interface PolarWebhookEvent {
  type: string
  data: {
    object: any
    previous_attributes?: any
  }
}

interface SubscriptionEvent {
  id: string
  status: string
  customer_id: string
  product_id: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
}

interface CustomerEvent {
  id: string
  email: string
  name?: string
}

// Helper functions for webhook logic
async function handleCustomerCreatedLogic(ctx: any, customer: CustomerEvent) {
  // Find user by email
  const user = await ctx.db
    .query("users")
    .filter((q: any) => q.eq(q.field("email"), customer.email))
    .first()

  if (!user) {
    console.warn(`No user found for email: ${customer.email}`)
    return
  }

  // Create or update polar customer record
  const existingCustomer = await ctx.db
    .query("polarCustomers")
    .filter((q: any) => q.eq(q.field("polarCustomerId"), customer.id))
    .first()

  if (!existingCustomer) {
    await ctx.db.insert("polarCustomers", {
      userId: user._id,
      polarCustomerId: customer.id,
      email: customer.email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }
}

async function handleCustomerUpdatedLogic(ctx: any, customer: CustomerEvent) {
  const existingCustomer = await ctx.db
    .query("polarCustomers")
    .filter((q: any) => q.eq(q.field("polarCustomerId"), customer.id))
    .first()

  if (existingCustomer) {
    await ctx.db.patch(existingCustomer._id, {
      email: customer.email,
      updatedAt: Date.now(),
    })
  }
}

async function handleSubscriptionCreatedLogic(ctx: any, subscription: SubscriptionEvent) {
  // Find customer
  const customer = await ctx.db
    .query("polarCustomers")
    .filter((q: any) => q.eq(q.field("polarCustomerId"), subscription.customer_id))
    .first()

  if (!customer) {
    console.warn(`No customer found for ID: ${subscription.customer_id}`)
    return
  }

  // Create subscription record
  await ctx.db.insert("polarSubscriptions", {
    userId: customer.userId,
    polarSubscriptionId: subscription.id,
    polarCustomerId: subscription.customer_id,
    polarProductId: subscription.product_id,
    planType: "starter", // Only starter plan for now
    status: subscription.status as "active" | "canceled" | "past_due" | "incomplete" | "trialing",
    currentPeriodStart: new Date(subscription.current_period_start).getTime(),
    currentPeriodEnd: new Date(subscription.current_period_end).getTime(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  // Allocate initial credits if subscription is active
  if (subscription.status === "active") {
    await allocateCreditsToUser(ctx, customer.userId, subscription.id)
  }
}

async function handleSubscriptionUpdatedLogic(ctx: any, subscription: SubscriptionEvent) {
  const existingSubscription = await ctx.db
    .query("polarSubscriptions")
    .filter((q: any) => q.eq(q.field("polarSubscriptionId"), subscription.id))
    .first()

  if (!existingSubscription) {
    console.warn(`No subscription found for ID: ${subscription.id}`)
    return
  }

  const wasActive = existingSubscription.status === "active"
  const isNowActive = subscription.status === "active"

  // Update subscription
  await ctx.db.patch(existingSubscription._id, {
    status: subscription.status as "active" | "canceled" | "past_due" | "incomplete" | "trialing",
    currentPeriodStart: new Date(subscription.current_period_start).getTime(),
    currentPeriodEnd: new Date(subscription.current_period_end).getTime(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: Date.now(),
  })

  // Allocate credits if subscription became active
  if (!wasActive && isNowActive) {
    await allocateCreditsToUser(ctx, existingSubscription.userId, subscription.id)
  }
}

async function handleSubscriptionCanceledLogic(ctx: any, subscription: SubscriptionEvent) {
  const existingSubscription = await ctx.db
    .query("polarSubscriptions")
    .filter((q: any) => q.eq(q.field("polarSubscriptionId"), subscription.id))
    .first()

  if (existingSubscription) {
    await ctx.db.patch(existingSubscription._id, {
      status: "canceled",
      cancelAtPeriodEnd: true,
      updatedAt: Date.now(),
    })
  }
}

// Internal mutation handlers
export const handleCustomerCreated = internalMutation({
  args: {
    customer: v.object({
      id: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
    })
  },
  handler: async (ctx, { customer }) => {
    await handleCustomerCreatedLogic(ctx, customer)
  }
})

export const handleCustomerUpdated = internalMutation({
  args: {
    customer: v.object({
      id: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
    })
  },
  handler: async (ctx, { customer }) => {
    await handleCustomerUpdatedLogic(ctx, customer)
  }
})

export const handleSubscriptionCreated = internalMutation({
  args: {
    subscription: v.object({
      id: v.string(),
      status: v.string(),
      customer_id: v.string(),
      product_id: v.string(),
      current_period_start: v.string(),
      current_period_end: v.string(),
      cancel_at_period_end: v.boolean(),
    })
  },
  handler: async (ctx, { subscription }) => {
    await handleSubscriptionCreatedLogic(ctx, subscription)
  }
})

export const handleSubscriptionUpdated = internalMutation({
  args: {
    subscription: v.object({
      id: v.string(),
      status: v.string(),
      customer_id: v.string(),
      product_id: v.string(),
      current_period_start: v.string(),
      current_period_end: v.string(),
      cancel_at_period_end: v.boolean(),
    })
  },
  handler: async (ctx, { subscription }) => {
    await handleSubscriptionUpdatedLogic(ctx, subscription)
  }
})

export const handleSubscriptionCanceled = internalMutation({
  args: {
    subscription: v.object({
      id: v.string(),
      status: v.string(),
      customer_id: v.string(),
      product_id: v.string(),
      current_period_start: v.string(),
      current_period_end: v.string(),
      cancel_at_period_end: v.boolean(),
    })
  },
  handler: async (ctx, { subscription }) => {
    await handleSubscriptionCanceledLogic(ctx, subscription)
  }
})

// Helper function for credit allocation
async function allocateCreditsToUser(
  ctx: any,
  userId: any,
  subscriptionId: string
) {
  const STARTER_CREDITS = 800 // Monthly credit allocation

  // Get or create credit balance
  let creditBalance = await ctx.db
    .query("creditBalances")
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .first()

  if (!creditBalance) {
    const now = Date.now()
    const periodStart = new Date(now).setDate(1) // Start of current month
    const periodEnd = new Date(new Date(periodStart).setMonth(new Date(periodStart).getMonth() + 1)).getTime() - 1 // End of current month
    
    creditBalance = await ctx.db.insert("creditBalances", {
      userId,
      balance: 0,
      monthlyAllocation: 0,
      allocatedAt: now,
      periodStart,
      periodEnd,
      periodUsage: 0,
      updatedAt: now,
    })
  }

  // Add credits to balance
  const newBalance = creditBalance.balance + STARTER_CREDITS
  const newMonthlyAllocation = creditBalance.monthlyAllocation + STARTER_CREDITS

  await ctx.db.patch(creditBalance._id, {
    balance: newBalance,
    monthlyAllocation: newMonthlyAllocation,
    allocatedAt: Date.now(),
    updatedAt: Date.now(),
  })

  // Record transaction
  await ctx.db.insert("creditTransactions", {
    userId,
    type: "allocation",
    amount: STARTER_CREDITS,
    balance: newBalance,
    description: `Monthly credit allocation for subscription ${subscriptionId}`,
    polarPaymentId: subscriptionId,
    createdAt: Date.now(),
  })

  console.log(`Allocated ${STARTER_CREDITS} credits to user ${userId}`)
}

export const allocateSubscriptionCredits = internalMutation({
  args: {
    userId: v.id("users"),
    subscriptionId: v.string(),
  },
  handler: async (ctx, { userId, subscriptionId }) => {
    await allocateCreditsToUser(ctx, userId, subscriptionId)
  }
})

// Main webhook handler
export const handlePolarWebhook = httpAction(async (ctx, request) => {
  // Verify webhook signature
  const signature = request.headers.get("polar-signature")
  const body = await request.text()
  
  if (!signature) {
    return new Response("Missing signature", { status: 400 })
  }

  // TODO: Verify webhook signature with POLAR_WEBHOOK_SECRET
  // For now, we'll skip verification in development
  
  let event: PolarWebhookEvent
  try {
    event = JSON.parse(body)
  } catch (error) {
    console.error("Failed to parse webhook body:", error)
    return new Response("Invalid JSON", { status: 400 })
  }

  console.log(`Processing Polar webhook: ${event.type}`)

  try {
    switch (event.type) {
      case "customer.created":
        await handleCustomerCreatedLogic(ctx, event.data.object as CustomerEvent)
        break

      case "customer.updated":
        await handleCustomerUpdatedLogic(ctx, event.data.object as CustomerEvent)
        break

      case "subscription.created":
        await handleSubscriptionCreatedLogic(ctx, event.data.object as SubscriptionEvent)
        break

      case "subscription.updated":
        await handleSubscriptionUpdatedLogic(ctx, event.data.object as SubscriptionEvent)
        break

      case "subscription.canceled":
        await handleSubscriptionCanceledLogic(ctx, event.data.object as SubscriptionEvent)
        break

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    return new Response("OK", { status: 200 })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return new Response("Internal server error", { status: 500 })
  }
})