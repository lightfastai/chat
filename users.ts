import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "./_generated/server.js"

/**
 * Get the current authenticated user's information
 */
export const current = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      image: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      phone: v.optional(v.string()),
      phoneVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx, _args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    return await ctx.db.get(userId)
  },
})

/**
 * Get user by ID (useful for displaying user info in messages, etc.)
 */
export const getById = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      image: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      phone: v.optional(v.string()),
      phoneVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})
