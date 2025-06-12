import { convexAuth } from "@convex-dev/auth/server"
import GitHub from "@auth/core/providers/github"
import { Anonymous } from "@convex-dev/auth/providers/Anonymous"

// Enable anonymous authentication for any non-production environment
const isNonProductionEnvironment = process.env.NODE_ENV !== "production"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub,
    // Only add Anonymous provider for non-production environments
    ...(isNonProductionEnvironment ? [Anonymous()] : []),
  ],
})
