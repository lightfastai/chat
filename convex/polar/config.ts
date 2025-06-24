// Credit costs per model (per message)
// Based on current API pricing + 20% markup, assuming 500 input + 500 output tokens
export const CREDIT_COSTS = {
  "gpt-4o": 1, // $0.0075 actual cost
  "gpt-4o-mini": 1, // $0.00045 actual cost (minimum 1 credit)
  o1: 2, // Estimated higher cost
  "o1-mini": 1, // Estimated
  "claude-3-5-sonnet-latest": 2, // $0.0108 actual cost
  "claude-3-5-haiku-latest": 1, // $0.00288 actual cost
  // Special actions (estimated based on complexity)
  computer_use: 5,
  image_generation: 3,
  file_analysis: 2,
} as const

// Plan configurations
export const PLANS = {
  starter: {
    name: "Starter",
    price: 8, // $8/month
    credits: 800, // Monthly credits
    features: ["800 credits/month", "All AI models", "Email support"],
  },
} as const

export type PlanType = keyof typeof PLANS

// Polar API configuration
export const POLAR_CONFIG = {
  apiUrl: "https://api.polar.sh",
  webhookPath: "/api/webhooks/polar",
  // Product IDs will be set after creating products in Polar
  productIds: {
    starter: process.env.POLAR_STARTER_PRODUCT_ID ?? "",
  },
} as const

// Helper functions
export function getCreditsForPlan(planType: PlanType): number {
  return PLANS[planType].credits
}

export function getCreditCost(
  model: string,
  action?: "chat" | "computer_use" | "image_generation" | "file_analysis",
): number {
  if (action && action !== "chat") {
    return CREDIT_COSTS[action] ?? 0
  }
  return CREDIT_COSTS[model as keyof typeof CREDIT_COSTS] ?? 10
}

export function canUseFeature(_planType: PlanType, feature: string): boolean {
  // Starter plan has access to all models
  if (feature === "all_models") return true

  // All other features available with starter
  return true
}
