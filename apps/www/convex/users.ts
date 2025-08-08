import { v } from "convex/values";
import { query } from "./_generated/server.js";
import { getAuthenticatedUserId } from "./lib/auth.js";
import {
	emailValidator,
	phoneValidator,
	urlValidator,
	userNameValidator,
} from "./validators.js";

/**
 * Get the current authenticated user's information
 */
export const current = query({
	args: {},
	handler: async (ctx, _args) => {
		try {
			// Get the mapped Convex user ID using Clerk authentication
			const userId = await getAuthenticatedUserId(ctx);
			return await ctx.db.get(userId);
		} catch {
			// Return null for unauthenticated users
			return null;
		}
	},
});

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
			name: v.optional(userNameValidator),
			email: v.optional(emailValidator),
			image: v.optional(urlValidator),
			emailVerificationTime: v.optional(v.number()),
			phone: phoneValidator,
			phoneVerificationTime: v.optional(v.number()),
			isAnonymous: v.optional(v.boolean()),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		return await ctx.db.get(args.userId);
	},
});
