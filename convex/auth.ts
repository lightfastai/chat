import GitHub from "@auth/core/providers/github"
import { Anonymous } from "@convex-dev/auth/providers/Anonymous"
import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth } from "@convex-dev/auth/server"
import { env } from "./env.js"

// Feature-based authentication configuration
const hasGitHubOAuth = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET)
const isNonProductionEnvironment = env.NODE_ENV !== "production"

// Password auth is always enabled by default (can be explicitly disabled)
const enablePasswordAuth = env.NEXT_PUBLIC_ENABLE_PASSWORD_AUTH !== "false"

// Enable anonymous auth in non-production environments
const enableAnonymousAuth =
  isNonProductionEnvironment || env.NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH === "true"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Password authentication (default, always available)
    ...(enablePasswordAuth
      ? [
          Password({
            id: "password",
            validatePasswordRequirements: (password: string) => {
              if (!password || password.length < 8) {
                throw new Error("Password must be at least 8 characters long")
              }
            },
            profile: (params) => {
              return {
                email: params.email as string,
                name:
                  (params.name as string) ||
                  (params.email as string).split("@")[0],
              }
            },
          }),
        ]
      : []),

    // GitHub OAuth (when credentials are configured)
    ...(hasGitHubOAuth ? [GitHub] : []),

    // Anonymous authentication (development/testing)
    ...(enableAnonymousAuth ? [Anonymous()] : []),
  ],
})
