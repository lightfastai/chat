import GitHub from "@auth/core/providers/github";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { env } from "./env.js";

// Enable anonymous authentication for any non-production environment
const isNonProductionEnvironment = env.NODE_ENV !== "production";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [
		GitHub,
		// Only add Anonymous provider for non-production environments
		...(isNonProductionEnvironment ? [Anonymous()] : []),
	],
	callbacks: {
		async createOrUpdateUser(ctx, args) {
			// Check if this is a new user (no existing user ID)
			if (!args.existingUserId) {
				// Block new user signups during migration
				throw new ConvexError({
					code: "SIGNUP_DISABLED",
					message: "New user registrations are temporarily disabled during migration. Please try again later.",
				});
			}
			// Allow existing users to sign in
			return args.existingUserId;
		},
	},
});
