/**
 * Feature flags and environment-based configuration
 *
 * This module centralizes all feature flags for the application,
 * allowing for different configurations between open-source and hosted versions.
 */

interface FeatureConfig {
  // Authentication features
  auth: {
    github: boolean
    password: boolean
    anonymous: boolean
  }

  // Monitoring and analytics (for hosted version)
  monitoring: {
    sentry: boolean
    analytics: boolean
  }

  // Commercial features (for hosted version)
  commercial: {
    polar: boolean
    billing: boolean
  }

  // Development features
  development: {
    debugTools: boolean
    devMode: boolean
  }
}

/**
 * Environment detection utilities
 */
export const env = {
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
  isPreview: process.env.NEXT_PUBLIC_VERCEL_ENV === "preview",
  isVercel: Boolean(process.env.VERCEL),
  isHosted: process.env.NEXT_PUBLIC_HOSTED_VERSION === "true",
} as const

/**
 * Check if environment variables are configured for a feature
 */
const hasGitHubOAuth = Boolean(
  process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET,
)

const hasSentryConfig = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
)

/**
 * Feature configuration based on environment and available credentials
 */
export const features: FeatureConfig = {
  auth: {
    // GitHub OAuth available when credentials are configured
    github: hasGitHubOAuth,

    // Password auth is always available (default authentication method)
    // Can be disabled by explicitly setting NEXT_PUBLIC_ENABLE_PASSWORD_AUTH=false
    password: process.env.NEXT_PUBLIC_ENABLE_PASSWORD_AUTH !== "false",

    // Anonymous auth only in non-production environments (unless explicitly enabled)
    anonymous:
      !env.isProduction ||
      process.env.NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH === "true",
  },

  monitoring: {
    // Sentry only when configured and enabled
    sentry:
      hasSentryConfig &&
      (env.isHosted || process.env.NEXT_PUBLIC_ENABLE_SENTRY === "true"),

    // Analytics for hosted version or when explicitly enabled
    analytics:
      env.isHosted || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  },

  commercial: {
    // Commercial features only for hosted version
    polar: env.isHosted || process.env.NEXT_PUBLIC_ENABLE_POLAR === "true",
    billing: env.isHosted || process.env.NEXT_PUBLIC_ENABLE_BILLING === "true",
  },

  development: {
    // Debug tools in development or when explicitly enabled
    debugTools:
      env.isDevelopment ||
      process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOOLS === "true",

    // Dev mode detection
    devMode: env.isDevelopment,
  },
}

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(featurePath: string): boolean {
  const path = featurePath.split(".")
  let current: unknown = features

  for (const key of path) {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return false
    }
    current = (current as Record<string, unknown>)[key]
  }

  return Boolean(current)
}

/**
 * Get available authentication providers based on configuration
 */
export function getAvailableAuthProviders(): Array<
  "github" | "password" | "anonymous"
> {
  const providers: Array<"github" | "password" | "anonymous"> = []

  if (features.auth.github) providers.push("github")
  if (features.auth.password) providers.push("password")
  if (features.auth.anonymous) providers.push("anonymous")

  return providers
}

/**
 * Runtime configuration for logging and debugging
 */
export const config = {
  features,
  env,
  availableAuthProviders: getAvailableAuthProviders(),

  // Debug information (only in development)
  ...(env.isDevelopment && {
    debug: {
      hasGitHubOAuth,
      hasSentryConfig,
      envVars: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
        NEXT_PUBLIC_HOSTED_VERSION: process.env.NEXT_PUBLIC_HOSTED_VERSION,
      },
    },
  }),
} as const

// Type exports for use in other modules
export type { FeatureConfig }
