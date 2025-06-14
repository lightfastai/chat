import { v } from "convex/values"
import { query } from "../_generated/server"

/**
 * Get Polar customer by user ID
 */
export const getByUserId = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("polarCustomers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()
  },
})

/**
 * Get Polar customer by Polar customer ID
 */
export const getByPolarId = query({
  args: {
    polarCustomerId: v.string(),
  },
  handler: async (ctx, { polarCustomerId }) => {
    return await ctx.db
      .query("polarCustomers")
      .withIndex("by_polar_id", (q) => q.eq("polarCustomerId", polarCustomerId))
      .first()
  },
})
