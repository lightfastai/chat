import { z } from "zod"

// Feature flag definitions
export const FEATURE_FLAGS = {
  AUTHENTICATION: "authentication",
  SENTRY: "sentry",
  POLAR: "polar",
  ARCJET: "arcjet",
} as const

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]

// Authentication modes
export const AUTH_MODES = {
  PASSWORD: "password",
  GITHUB: "github",
  ANONYMOUS: "anonymous",
} as const

export type AuthMode = (typeof AUTH_MODES)[keyof typeof AUTH_MODES]

// Feature flag configuration schema
export const featureFlagConfigSchema = z.object({
  authentication: z
    .object({
      enabled: z.boolean().default(true),
      modes: z
        .array(
          z.enum([
            AUTH_MODES.PASSWORD,
            AUTH_MODES.GITHUB,
            AUTH_MODES.ANONYMOUS,
          ]),
        )
        .default([AUTH_MODES.PASSWORD]),
      defaultMode: z
        .enum([AUTH_MODES.PASSWORD, AUTH_MODES.GITHUB, AUTH_MODES.ANONYMOUS])
        .default(AUTH_MODES.PASSWORD),
      requireEmailVerification: z.boolean().default(false),
    })
    .optional(),
  sentry: z
    .object({
      enabled: z.boolean().default(false),
      dsn: z.string().optional(),
      environment: z.string().optional(),
    })
    .optional(),
  polar: z
    .object({
      enabled: z.boolean().default(false),
      apiKey: z.string().optional(),
    })
    .optional(),
  arcjet: z
    .object({
      enabled: z.boolean().default(false),
      apiKey: z.string().optional(),
    })
    .optional(),
})

export type FeatureFlagConfig = z.infer<typeof featureFlagConfigSchema>

// Environment-based feature flag configuration
function createFeatureFlagConfig(): FeatureFlagConfig {
  const config: FeatureFlagConfig = {}

  // Authentication configuration
  const hasGitHubAuth = !!(
    process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
  )
  const isProduction = process.env.NODE_ENV === "production"
  const isVercelProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === "production"

  config.authentication = {
    enabled: true,
    modes: [],
    defaultMode: AUTH_MODES.PASSWORD,
    requireEmailVerification: false,
  }

  // Determine available auth modes based on environment
  if (hasGitHubAuth) {
    config.authentication.modes.push(AUTH_MODES.GITHUB)
    config.authentication.defaultMode = AUTH_MODES.GITHUB
  } else {
    config.authentication.modes.push(AUTH_MODES.PASSWORD)
    config.authentication.defaultMode = AUTH_MODES.PASSWORD
  }

  // Anonymous mode for non-production environments
  if (!isProduction && !isVercelProduction) {
    config.authentication.modes.push(AUTH_MODES.ANONYMOUS)
  }

  // Sentry configuration
  if (process.env.SENTRY_DSN) {
    config.sentry = {
      enabled: true,
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    }
  }

  // Polar configuration
  if (process.env.POLAR_API_KEY) {
    config.polar = {
      enabled: true,
      apiKey: process.env.POLAR_API_KEY,
    }
  }

  // Arcjet configuration
  if (process.env.ARCJET_KEY) {
    config.arcjet = {
      enabled: true,
      apiKey: process.env.ARCJET_KEY,
    }
  }

  return featureFlagConfigSchema.parse(config)
}

// Global feature flag configuration
export const featureFlags = createFeatureFlagConfig()

// Utility functions
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  switch (flag) {
    case FEATURE_FLAGS.AUTHENTICATION:
      return featureFlags.authentication?.enabled ?? true
    case FEATURE_FLAGS.SENTRY:
      return featureFlags.sentry?.enabled ?? false
    case FEATURE_FLAGS.POLAR:
      return featureFlags.polar?.enabled ?? false
    case FEATURE_FLAGS.ARCJET:
      return featureFlags.arcjet?.enabled ?? false
    default:
      return false
  }
}

export function getAuthModes(): AuthMode[] {
  return featureFlags.authentication?.modes ?? [AUTH_MODES.PASSWORD]
}

export function getDefaultAuthMode(): AuthMode {
  return featureFlags.authentication?.defaultMode ?? AUTH_MODES.PASSWORD
}

export function isAuthModeEnabled(mode: AuthMode): boolean {
  return getAuthModes().includes(mode)
}

export function getFeatureFlagConfig(): FeatureFlagConfig {
  return featureFlags
}

// Debug utility for development
export function debugFeatureFlags(): void {
  if (process.env.NODE_ENV === "development") {
    console.log(
      "🚩 Feature Flags Configuration:",
      JSON.stringify(featureFlags, null, 2),
    )
  }
}
