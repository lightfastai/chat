import type {
  AnthropicModel,
  ModelConfig,
  ModelId,
  ModelProvider,
  OpenAIModel,
  OpenRouterModel,
} from "./types"

/**
 * OpenAI Model Configurations
 */
export const OPENAI_MODELS: Record<OpenAIModel, ModelConfig> = {
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    provider: "openai",
    name: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    description: "Fast and efficient model for most tasks",
    maxTokens: 128000,
    costPer1KTokens: {
      input: 0.00015,
      output: 0.0006,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  "gpt-4o": {
    id: "gpt-4o",
    provider: "openai",
    name: "gpt-4o",
    displayName: "GPT-4o",
    description: "Most capable GPT-4 model with vision capabilities",
    maxTokens: 128000,
    costPer1KTokens: {
      input: 0.0025,
      output: 0.01,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  "gpt-3.5-turbo": {
    id: "gpt-3.5-turbo",
    provider: "openai",
    name: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    description: "Fast, reliable model for simple tasks",
    maxTokens: 16385,
    costPer1KTokens: {
      input: 0.0005,
      output: 0.0015,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },
}

/**
 * Anthropic Model Configurations
 */
export const ANTHROPIC_MODELS: Record<AnthropicModel, ModelConfig> = {
  "claude-sonnet-4-20250514": {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    name: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4.0",
    description: "Claude Sonnet 4.0 - Superior coding and reasoning model",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.003,
      output: 0.015,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      thinking: false, // Standard mode without thinking
    },
  },
  "claude-sonnet-4-20250514-thinking": {
    id: "claude-sonnet-4-20250514-thinking",
    provider: "anthropic",
    name: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4.0 (Thinking)",
    description:
      "Claude Sonnet 4.0 with extended thinking for complex reasoning",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.003,
      output: 0.015,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      thinking: true,
    },
    thinkingConfig: {
      enabled: true,
      defaultBudgetTokens: 12000,
    },
  },
  "claude-3-5-sonnet-20241022": {
    id: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    name: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    description: "Previous generation high-performance model",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.003,
      output: 0.015,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  "claude-3-haiku-20240307": {
    id: "claude-3-haiku-20240307",
    provider: "anthropic",
    name: "claude-3-haiku-20240307",
    displayName: "Claude 3 Haiku",
    description: "Fast and cost-effective for simple tasks",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.00025,
      output: 0.00125,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
}

/**
 * OpenRouter Model Configurations
 */
export const OPENROUTER_MODELS: Record<OpenRouterModel, ModelConfig> = {
  "meta-llama/llama-3.3-70b-instruct": {
    id: "meta-llama/llama-3.3-70b-instruct",
    provider: "openrouter",
    name: "meta-llama/llama-3.3-70b-instruct",
    displayName: "Llama 3.3 70B",
    description: "Meta's latest and most capable open model",
    maxTokens: 131072,
    costPer1KTokens: {
      input: 0.00035,
      output: 0.0004,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },
  "anthropic/claude-3.5-sonnet": {
    id: "anthropic/claude-3.5-sonnet",
    provider: "openrouter",
    name: "anthropic/claude-3.5-sonnet",
    displayName: "Claude 3.5 Sonnet (via OpenRouter)",
    description: "Claude 3.5 Sonnet through OpenRouter",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.003,
      output: 0.015,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  "openai/gpt-4o": {
    id: "openai/gpt-4o",
    provider: "openrouter",
    name: "openai/gpt-4o",
    displayName: "GPT-4o (via OpenRouter)",
    description: "GPT-4o through OpenRouter",
    maxTokens: 128000,
    costPer1KTokens: {
      input: 0.0025,
      output: 0.01,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  "google/gemini-pro-1.5": {
    id: "google/gemini-pro-1.5",
    provider: "openrouter",
    name: "google/gemini-pro-1.5",
    displayName: "Gemini 1.5 Pro",
    description: "Google's advanced multimodal model",
    maxTokens: 2097152,
    costPer1KTokens: {
      input: 0.00125,
      output: 0.005,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  "mistralai/mistral-large": {
    id: "mistralai/mistral-large",
    provider: "openrouter",
    name: "mistralai/mistral-large",
    displayName: "Mistral Large",
    description:
      "Mistral's flagship model with strong multilingual capabilities",
    maxTokens: 128000,
    costPer1KTokens: {
      input: 0.002,
      output: 0.006,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },
}

/**
 * All available models combined
 */
export const ALL_MODELS: Record<ModelId, ModelConfig> = {
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...OPENROUTER_MODELS,
} as const

/**
 * Default model ID
 */
export const DEFAULT_MODEL_ID: ModelId = "gpt-4o-mini"

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
  return Object.values(ALL_MODELS).filter(
    (model) => model.provider === provider,
  )
}

/**
 * Get all available models
 */
export function getAllModels(): ModelConfig[] {
  return Object.values(ALL_MODELS)
}

/**
 * Get model configuration by ID
 */
export function getModelById(id: string): ModelConfig | undefined {
  return ALL_MODELS[id as ModelId]
}

/**
 * Get model display name by ID
 */
export function getModelDisplayName(modelId: string): string {
  const model = getModelById(modelId)
  return model?.displayName ?? "Unknown Model"
}

/**
 * Check if model supports a specific feature
 */
export function modelSupportsFeature(
  modelId: string,
  feature: keyof ModelConfig["features"],
): boolean {
  const model = getModelById(modelId)
  return model?.features[feature] ?? false
}
