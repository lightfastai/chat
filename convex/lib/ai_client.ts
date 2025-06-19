import { anthropic, createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI, openai } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"
import {
  type ModelId,
  getActualModelName,
  getProviderFromModelId,
} from "../../src/lib/ai/schemas.js"
import { env } from "../env.js"

// Type for user API keys (matching getDecryptedApiKeys return type)
type UserApiKeys = {
  openai?: string
  anthropic?: string
  openrouter?: string
}

/**
 * Create an AI client based on provider and user API keys
 * Single source of truth for AI client creation
 */
export function createAIClient(
  modelId: ModelId,
  userApiKeys?: UserApiKeys | null,
): LanguageModel {
  const provider = getProviderFromModelId(modelId)
  const actualModelName = getActualModelName(modelId)

  switch (provider) {
    case "anthropic":
      if (userApiKeys?.anthropic) {
        return createAnthropic({ apiKey: userApiKeys.anthropic })(
          actualModelName,
        )
      }
      return anthropic(actualModelName)

    case "openai":
      if (userApiKeys?.openai) {
        return createOpenAI({ apiKey: userApiKeys.openai })(actualModelName)
      }
      return openai(actualModelName)

    case "openrouter": {
      const headers = { "X-Title": "Lightfast Chat" }
      const baseURL = "https://openrouter.ai/api/v1"

      if (userApiKeys?.openrouter) {
        return createOpenAI({
          apiKey: userApiKeys.openrouter,
          baseURL,
          headers,
        })(actualModelName)
      }

      return createOpenAI({
        apiKey: env.OPENROUTER_API_KEY,
        baseURL,
        headers,
      })(actualModelName)
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Check if user's API key will be used for a given provider
 */
export function willUseUserApiKey(
  provider: "anthropic" | "openai" | "openrouter",
  userApiKeys?: UserApiKeys | null,
): boolean {
  if (!userApiKeys) return false

  switch (provider) {
    case "anthropic":
      return !!userApiKeys.anthropic
    case "openai":
      return !!userApiKeys.openai
    case "openrouter":
      return !!userApiKeys.openrouter
    default:
      return false
  }
}
