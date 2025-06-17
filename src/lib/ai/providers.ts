import { anthropic } from "@ai-sdk/anthropic"
import { createOpenAI, openai } from "@ai-sdk/openai"
import type { CoreMessage } from "ai"
import { getModelById } from "./models"
import { getProviderFromModelId } from "./types"
import type {
  AIGenerationOptions,
  ChatMessage,
  ModelId,
  ModelProvider,
} from "./types"

/**
 * Provider configurations and settings
 */
export const PROVIDER_CONFIG = {
  openai: {
    name: "OpenAI",
    apiKeyEnvVar: "OPENAI_API_KEY",
    models: [
      "gpt-4o-mini",
      "gpt-4o",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "o3-mini",
      "o4-mini",
      "gpt-3.5-turbo",
    ],
  },
  anthropic: {
    name: "Anthropic",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    models: [
      "claude-4-opus-20250514",
      "claude-4-sonnet-20250514",
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-20240620",
      "claude-3-5-haiku-20241022",
    ],
  },
  openrouter: {
    name: "OpenRouter",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    models: [
      "meta-llama/llama-3.3-70b-instruct",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "google/gemini-pro-1.5",
      "mistralai/mistral-large",
    ],
  },
} as const

/**
 * Get the appropriate language model instance for a provider
 * Note: This uses the default model for the provider
 */
export function getLanguageModel(provider: ModelProvider) {
  // Get first model for the provider as default
  const models = PROVIDER_CONFIG[provider].models
  const defaultModelId = models[0]
  const model = getModelById(defaultModelId)

  if (!model) {
    throw new Error(`Default model not found for provider: ${provider}`)
  }

  switch (provider) {
    case "openai":
      return openai(model.name)
    case "anthropic":
      return anthropic(model.name)
    case "openrouter":
      // OpenRouter uses OpenAI-compatible API
      return createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "Lightfast Chat",
        },
      })(model.name)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Get language model by specific model ID
 */
export function getLanguageModelById(modelId: string) {
  const model = getModelById(modelId)
  if (!model) {
    throw new Error(`Model not found: ${modelId}`)
  }

  switch (model.provider) {
    case "openai":
      return openai(model.name)
    case "anthropic":
      return anthropic(model.name)
    case "openrouter":
      // OpenRouter uses OpenAI-compatible API
      return createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "Lightfast Chat",
        },
      })(model.name)
    default:
      throw new Error(`Unsupported provider: ${model.provider}`)
  }
}

/**
 * Convert chat messages to the format expected by AI SDK
 */
export function convertToAIMessages(messages: ChatMessage[]): CoreMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * Get default generation options for a provider
 */
export function getDefaultGenerationOptions(
  provider: ModelProvider,
): Partial<AIGenerationOptions> {
  // Get first model for the provider as default
  const models = PROVIDER_CONFIG[provider].models
  const defaultModelId = models[0]
  const model = getModelById(defaultModelId)

  if (!model) {
    // Fallback values if model not found
    return {
      maxTokens: 500,
      temperature: 0.7,
      stream: true,
    }
  }

  return {
    maxTokens: Math.min(500, model.maxTokens), // Conservative default
    temperature: 0.7,
    stream: true,
  }
}

/**
 * Validate if a provider is supported
 */
export function isProviderSupported(
  provider: string,
): provider is ModelProvider {
  return provider in PROVIDER_CONFIG
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: ModelProvider): string {
  return PROVIDER_CONFIG[provider].name
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): ModelProvider[] {
  return Object.keys(PROVIDER_CONFIG) as ModelProvider[]
}

/**
 * Create generation options with provider-specific defaults
 */
export function createGenerationOptions(
  modelId: string,
  overrides: Partial<AIGenerationOptions> = {},
): AIGenerationOptions {
  const provider = getProviderFromModelId(modelId as ModelId)
  if (!provider) {
    throw new Error(`Invalid model ID: ${modelId}`)
  }

  const defaults = getDefaultGenerationOptions(provider)

  return {
    modelId,
    messages: [],
    ...defaults,
    ...overrides,
  }
}
