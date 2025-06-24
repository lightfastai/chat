"use node"

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { action } from "../_generated/server"
import { POLAR_CONFIG } from "./config"

// Polar API types
interface PolarCustomer {
  id: string
  email: string
  name?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

interface PolarSubscription {
  id: string
  customer_id: string
  product_id: string
  status: "active" | "canceled" | "past_due" | "incomplete" | "trialing"
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

interface PolarCheckoutSession {
  id: string
  url: string
  customer_id?: string
  product_id: string
  success_url: string
  cancel_url?: string
}

// Helper to make Polar API requests
async function polarRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN not configured")
  }

  const response = await fetch(`${POLAR_CONFIG.apiUrl}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Polar API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Create or update a customer in Polar
export const createOrUpdateCustomer = action({
  args: {
    userId: v.id("users"),
    email: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.object({
    customerId: v.string(),
    email: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check if customer already exists
    const existingCustomer = await ctx.runQuery(
      internal.polar.mutations.internalGetCustomerByUserId,
      { userId: args.userId },
    )

    let customer: PolarCustomer

    if (existingCustomer?.polarCustomerId) {
      // Update existing customer
      customer = await polarRequest<PolarCustomer>(
        `/customers/${existingCustomer.polarCustomerId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            email: args.email,
            name: args.name,
            metadata: {
              userId: args.userId,
            },
          }),
        },
      )
    } else {
      // Create new customer
      customer = await polarRequest<PolarCustomer>("/customers", {
        method: "POST",
        body: JSON.stringify({
          email: args.email,
          name: args.name,
          metadata: {
            userId: args.userId,
          },
        }),
      })

      // Store customer record
      await ctx.runMutation(internal.polar.mutations.storeCustomer, {
        userId: args.userId,
        polarCustomerId: customer.id,
        email: customer.email,
      })
    }

    return {
      customerId: customer.id,
      email: customer.email,
    }
  },
})

// Create a checkout session for subscription
export const createCheckoutSession = action({
  args: {
    userId: v.id("users"),
    planType: v.literal("starter"),
    successUrl: v.string(),
    cancelUrl: v.optional(v.string()),
  },
  returns: v.object({
    checkoutUrl: v.string(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get or create customer
    const existingCustomer = await ctx.runQuery(
      internal.polar.mutations.internalGetCustomerByUserId,
      { userId: args.userId },
    )

    if (!existingCustomer) {
      throw new Error("Customer not found. Please create customer first.")
    }

    const productId = POLAR_CONFIG.productIds[args.planType]
    if (!productId) {
      throw new Error(`Product ID not configured for plan: ${args.planType}`)
    }

    const sessionData: any = {
      product_id: productId,
      customer_id: existingCustomer.polarCustomerId,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        userId: args.userId,
        planType: args.planType,
      },
    }

    const session = await polarRequest<PolarCheckoutSession>(
      "/checkout/sessions",
      {
        method: "POST",
        body: JSON.stringify(sessionData),
      },
    )

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    }
  },
})

// Get subscription details
export const getSubscription = action({
  args: {
    subscriptionId: v.string(),
  },
  returns: v.union(
    v.object({
      id: v.string(),
      status: v.string(),
      currentPeriodStart: v.string(),
      currentPeriodEnd: v.string(),
      cancelAtPeriodEnd: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (_ctx, args) => {
    try {
      const subscription = await polarRequest<PolarSubscription>(
        `/subscriptions/${args.subscriptionId}`,
      )

      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error)
      return null
    }
  },
})

// Cancel subscription
export const cancelSubscription = action({
  args: {
    subscriptionId: v.string(),
    immediate: v.optional(v.boolean()), // Cancel immediately vs at period end
  },
  returns: v.object({
    success: v.boolean(),
    cancelAt: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    try {
      const subscription = await polarRequest<PolarSubscription>(
        `/subscriptions/${args.subscriptionId}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({
            cancel_immediately: args.immediate ?? false,
          }),
        },
      )

      return {
        success: true,
        cancelAt: subscription.cancel_at_period_end
          ? subscription.current_period_end
          : new Date().toISOString(),
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error)
      return {
        success: false,
      }
    }
  },
})

// Get customer portal URL
export const getCustomerPortalUrl = action({
  args: {
    customerId: v.string(),
    returnUrl: v.string(),
  },
  returns: v.object({
    portalUrl: v.string(),
  }),
  handler: async (_ctx, args) => {
    const response = await polarRequest<{ url: string }>(
      `/customers/${args.customerId}/portal`,
      {
        method: "POST",
        body: JSON.stringify({
          return_url: args.returnUrl,
        }),
      },
    )

    return {
      portalUrl: response.url,
    }
  },
})
