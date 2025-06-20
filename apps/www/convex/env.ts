import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    // AI API Keys
    EXA_API_KEY: z.string().min(1).describe("Exa API key for web search"),
    OPENROUTER_API_KEY: z
      .string()
      .min(1)
      .describe("OpenRouter API key for AI models"),

    // Authentication & Encryption
    JWT_PRIVATE_KEY: z
      .string()
      .min(1)
      .describe("JWT private key for API key encryption"),
    ENCRYPTION_KEY: z
      .string()
      .optional()
      .describe("Fallback encryption key if JWT_PRIVATE_KEY is not available"),
    CONVEX_SITE_URL: z
      .string()
      .url()
      .optional()
      .describe("Site URL for authentication configuration"),

    // Environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development")
      .describe("Node environment"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  onValidationError: (error) => {
    console.error("❌ Invalid environment variables in Convex:", error)
    throw new Error("Invalid environment variables")
  },
  onInvalidAccess: (variable) => {
    throw new Error(
      `❌ Attempted to access a server-side environment variable on the client: ${variable}`,
    )
  },
})

// Type-safe environment variable access
export type ConvexEnv = typeof env
