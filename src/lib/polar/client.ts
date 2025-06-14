import { env } from "@/env"
import { Polar } from "@polar-sh/sdk"

/**
 * Polar SDK client instance
 *
 * This client is used for all server-side Polar API calls.
 * Do not use this client in client-side code!
 */
export const polar = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER || "production",
})

/**
 * Polar configuration constants
 */
export const POLAR_CONFIG = {
  organizationId: env.POLAR_ORGANIZATION_ID,
  webhookSecret: env.POLAR_WEBHOOK_SECRET,
  products: {
    free: env.POLAR_PRODUCT_FREE_ID,
    pro: env.POLAR_PRODUCT_PRO_ID,
    team: env.POLAR_PRODUCT_TEAM_ID,
  },
  meters: {
    aiTokens: env.POLAR_METER_AI_TOKENS_ID,
  },
} as const

/**
 * Product tier features and limits
 */
export const PRODUCT_FEATURES = {
  free: {
    name: "Free",
    description: "Get started with basic AI features",
    maxTokensPerMonth: 100_000,
    maxThreadsPerMonth: 50,
    maxMessagesPerDay: 100,
    allowedModels: ["gpt-3.5-turbo", "claude-3-haiku-20240307"],
    customApiKeys: false,
    priority: "standard" as const,
  },
  pro: {
    name: "Pro",
    description: "Enhanced features for power users",
    maxTokensPerMonth: 1_000_000,
    maxThreadsPerMonth: null, // unlimited
    maxMessagesPerDay: 1_000,
    allowedModels: "all" as const,
    customApiKeys: true,
    priority: "priority" as const,
    includedTokens: 1_000_000,
    overage: {
      enabled: true,
      pricePerThousandTokens: 0.01,
    },
  },
  team: {
    name: "Team",
    description: "Pay-as-you-go for teams",
    maxTokensPerMonth: null, // unlimited
    maxThreadsPerMonth: null, // unlimited
    maxMessagesPerDay: null, // unlimited
    allowedModels: "all" as const,
    customApiKeys: true,
    priority: "priority" as const,
    advancedFeatures: ["pdf_analysis", "image_generation"],
  },
} as const

export type ProductTier = keyof typeof PRODUCT_FEATURES
