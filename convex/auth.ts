import GitHub from "@auth/core/providers/github"
import Google from "@auth/core/providers/google"
import { Anonymous } from "@convex-dev/auth/providers/Anonymous"
import { convexAuth } from "@convex-dev/auth/server"
import { env } from "./env.js"

// Enable anonymous authentication for any non-production environment
const isNonProductionEnvironment = env.NODE_ENV !== "production"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    }),
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
    // Only add Anonymous provider for non-production environments
    ...(isNonProductionEnvironment ? [Anonymous()] : []),
  ],
})
