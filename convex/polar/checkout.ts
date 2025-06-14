import { getAuthUserId } from "@convex-dev/auth/server"
import { Polar } from "@polar-sh/sdk"
import { v } from "convex/values"
import { api } from "../_generated/api"
import { action } from "../_generated/server"

/**
 * Create a checkout session for upgrading to a paid plan
 */
export const createCheckout = action({
  args: {
    productId: v.string(),
  },
  handler: async (ctx, { productId }) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated to create checkout")
    }

    // Get user details
    const user = await ctx.runQuery(api.users.getUser, { userId })
    if (!user) {
      throw new Error("User not found")
    }

    // Check if user already has a Polar customer record
    const existingCustomer = await ctx.runQuery(
      api.polar.customers.getByUserId,
      {
        userId,
      },
    )

    try {
      // Initialize Polar client
      const polar = new Polar({
        accessToken: process.env.POLAR_ACCESS_TOKEN!,
        server: (process.env.POLAR_SERVER || "production") as
          | "production"
          | "sandbox",
      })

      // Create checkout session
      const checkout = await polar.checkouts.create({
        products: [productId],
        successUrl: `${process.env.SITE_URL || "http://localhost:3000"}/subscription/success`,
        // Include customer information
        customerEmail: user.email,
        customerName: user.name,
        customerMetadata: {
          userId: userId,
          convexUserId: userId,
        },
        // If we have an existing customer, link to them
        ...(existingCustomer && {
          customerId: existingCustomer.polarCustomerId,
        }),
      })

      return {
        checkoutId: checkout.id,
        checkoutUrl: checkout.url,
      }
    } catch (error) {
      console.error("Failed to create Polar checkout:", error)
      throw new Error("Failed to create checkout session")
    }
  },
})

/**
 * Create a customer portal session for managing subscriptions
 */
export const createCustomerPortal = action({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("User must be authenticated")
    }

    // Get Polar customer
    const customer = await ctx.runQuery(api.polar.customers.getByUserId, {
      userId,
    })

    if (!customer) {
      throw new Error("No customer record found")
    }

    try {
      // Initialize Polar client
      const polar = new Polar({
        accessToken: process.env.POLAR_ACCESS_TOKEN!,
        server: (process.env.POLAR_SERVER || "production") as
          | "production"
          | "sandbox",
      })

      // Create customer session
      const session = await polar.customerSessions.create({
        customerId: customer.polarCustomerId,
      })

      return {
        portalUrl: session.customerPortalUrl,
      }
    } catch (error) {
      console.error("Failed to create customer portal session:", error)
      throw new Error("Failed to create customer portal session")
    }
  },
})
