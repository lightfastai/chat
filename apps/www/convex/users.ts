import { v } from "convex/values";
import { query } from "./_generated/server.js";

/**
 * Get the current authenticated user.
 *
 * This function has been updated to use Clerk authentication directly,
 * returning Clerk user identity instead of querying the database.
 * The old user record lookup based on Convex user IDs has been replaced with
 * direct Clerk identity retrieval. This is part of the migration from Convex auth
 * to Clerk auth, removing the dependency on the old authentication system and
 * using a mapped Convex user ID.
 */
export const current = query({
	args: {},
	handler: async (ctx, _args) => {
		try {
			// Query users table using Clerk user identity
			// Note: This queries the auth tables created by @convex-dev/auth
			const identity = await ctx.auth.getUserIdentity();
			if (!identity) {
				return null;
			}

			// Return simplified user information from Clerk
			// Only returning essential fields to avoid type issues
			return {
				clerkUserId: identity.subject,
				email: typeof identity.email === "string" ? identity.email : undefined,
			};
		} catch {
			// Return null for unauthenticated users
			return null;
		}
	},
});

/**
 * Get a user by their Clerk user ID (string).
 * This replaces the old getById function that used Convex user IDs.
 *
 * Note: Currently this can only return the authenticated user's information
 * since we don't have a direct way to query other users by Clerk ID.
 */
export const getByClerkId = query({
	args: {
		clerkUserId: v.string(),
	},
	returns: v.union(
		v.object({
			clerkUserId: v.string(),
			email: v.optional(v.string()),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		// For now, we can only return the current user's information
		// since we don't have a direct way to query other users by Clerk ID
		// without additional database lookups

		try {
			const identity = await ctx.auth.getUserIdentity();
			if (!identity || identity.subject !== args.clerkUserId) {
				// Can only return info for the authenticated user
				return null;
			}

			return {
				clerkUserId: identity.subject,
				email: typeof identity.email === "string" ? identity.email : undefined,
			};
		} catch {
			return null;
		}
	},
});

/**
 * @deprecated Use getByClerkId instead
 *
 * This function is kept for backward compatibility but returns null
 * since we no longer use Convex user IDs.
 */
export const getById = query({
	args: {
		userId: v.id("users"),
	},
	handler: async (_ctx, _args) => {
		// This function is deprecated as we've migrated to Clerk user IDs
		// Returning null to prevent usage of old Convex user IDs
		return null;
	},
});
