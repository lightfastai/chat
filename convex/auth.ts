import GitHub from "@auth/core/providers/github"
import { Anonymous } from "@convex-dev/auth/providers/Anonymous"
import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth } from "@convex-dev/auth/server"
import { env } from "./env.js"

// Feature flag configuration
const hasGitHubAuth = !!(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET)
const isNonProductionEnvironment = env.NODE_ENV !== "production"

// Configure providers based on feature flags
const providers = []

// Add GitHub OAuth if configured
if (hasGitHubAuth) {
  providers.push(GitHub)
}

// Add Password auth as default fallback
providers.push(Password)

// Add Anonymous auth for non-production environments
if (isNonProductionEnvironment) {
  providers.push(Anonymous())
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
})
