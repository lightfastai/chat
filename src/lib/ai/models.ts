import type {
  AnthropicModel,
  ModelConfig,
  ModelId,
  ModelProvider,
  OpenAIModel,
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
      pdfSupport: true,
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
      pdfSupport: true,
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
      pdfSupport: true,
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
      pdfSupport: true,
    },
  },
}

/**
 * All available models combined
 */
export const ALL_MODELS: Record<ModelId, ModelConfig> = {
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
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
