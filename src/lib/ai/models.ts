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
      input: 0.003,
      output: 0.01,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  "gpt-4.1": {
    id: "gpt-4.1",
    provider: "openai",
    name: "gpt-4.1",
    displayName: "GPT-4.1",
    description: "Enhanced GPT-4 with 1M token context for developers",
    maxTokens: 1000000,
    costPer1KTokens: {
      input: 0.01,
      output: 0.04,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  o3: {
    id: "o3",
    provider: "openai",
    name: "o3",
    displayName: "o3",
    description: "Most powerful reasoning model for complex problem-solving",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.002,
      output: 0.008,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  "gpt-4.1-mini": {
    id: "gpt-4.1-mini",
    provider: "openai",
    name: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    description: "Efficient GPT-4.1 model for everyday tasks",
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
  "gpt-4.1-nano": {
    id: "gpt-4.1-nano",
    provider: "openai",
    name: "gpt-4.1-nano",
    displayName: "GPT-4.1 Nano",
    description: "Ultra-efficient model for simple tasks with 1M context",
    maxTokens: 1000000,
    costPer1KTokens: {
      input: 0.0001,
      output: 0.0004,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },
  "o3-mini": {
    id: "o3-mini",
    provider: "openai",
    name: "o3-mini",
    displayName: "o3-mini",
    description: "Fast reasoning model for STEM tasks (deprecated)",
    maxTokens: 128000,
    costPer1KTokens: {
      input: 0.0011,
      output: 0.0044,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  },
  "o4-mini": {
    id: "o4-mini",
    provider: "openai",
    name: "o4-mini-2025-04-16",
    displayName: "o4-mini",
    description: "Latest fast reasoning model excelling at math & STEM",
    maxTokens: 128000,
    costPer1KTokens: {
      input: 0.0011,
      output: 0.0044,
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
      input: 0.001,
      output: 0.002,
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
  "claude-4-opus-20250514": {
    id: "claude-4-opus-20250514",
    provider: "anthropic",
    name: "claude-4-opus-20250514",
    displayName: "Claude 4 Opus",
    description: "Most powerful model for complex tasks",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.015,
      output: 0.075,
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
      defaultBudgetTokens: 20000,
    },
  },
  "claude-4-sonnet-20250514": {
    id: "claude-4-sonnet-20250514",
    provider: "anthropic",
    name: "claude-4-sonnet-20250514",
    displayName: "Claude 4 Sonnet",
    description: "Latest generation superior coding and reasoning model",
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
  "claude-3-7-sonnet-20250219": {
    id: "claude-3-7-sonnet-20250219",
    provider: "anthropic",
    name: "claude-3-7-sonnet-20250219",
    displayName: "Claude 3.7 Sonnet",
    description: "Enhanced performance model with improved capabilities",
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
    displayName: "Claude 3.5 Sonnet (2024-10-22)",
    description: "Fast and capable model for most tasks",
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
  "claude-3-5-sonnet-20240620": {
    id: "claude-3-5-sonnet-20240620",
    provider: "anthropic",
    name: "claude-3-5-sonnet-20240620",
    displayName: "Claude 3.5 Sonnet (2024-06-20)",
    description: "Previous version of Claude 3.5 Sonnet",
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
  "claude-3-5-haiku-20241022": {
    id: "claude-3-5-haiku-20241022",
    provider: "anthropic",
    name: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku",
    description: "Ultra-fast model for lightweight tasks",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.0008,
      output: 0.004,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      pdfSupport: false,
    },
  },

  // Thinking mode variants
  "claude-4-opus-20250514-thinking": {
    id: "claude-4-opus-20250514-thinking",
    provider: "anthropic",
    name: "claude-4-opus-20250514",
    displayName: "Claude 4 Opus (Thinking)",
    description: "Most powerful model with visible reasoning process",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.015,
      output: 0.075,
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
      defaultBudgetTokens: 20000,
    },
  },
  "claude-4-sonnet-20250514-thinking": {
    id: "claude-4-sonnet-20250514-thinking",
    provider: "anthropic",
    name: "claude-4-sonnet-20250514",
    displayName: "Claude 4 Sonnet (Thinking)",
    description: "Balanced model with visible reasoning process",
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
      defaultBudgetTokens: 15000,
    },
  },
  "claude-3-7-sonnet-20250219-thinking": {
    id: "claude-3-7-sonnet-20250219-thinking",
    provider: "anthropic",
    name: "claude-3-7-sonnet-20250219",
    displayName: "Claude 3.7 Sonnet (Thinking)",
    description: "Enhanced Claude 3.5 with visible reasoning process",
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
  },
  "claude-3-5-sonnet-20241022-thinking": {
    id: "claude-3-5-sonnet-20241022-thinking",
    provider: "anthropic",
    name: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet (Oct 2024) (Thinking)",
    description: "Latest Claude 3.5 with visible reasoning process",
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
  },
  "claude-3-5-sonnet-20240620-thinking": {
    id: "claude-3-5-sonnet-20240620-thinking",
    provider: "anthropic",
    name: "claude-3-5-sonnet-20240620",
    displayName: "Claude 3.5 Sonnet (Jun 2024) (Thinking)",
    description: "Original Claude 3.5 with visible reasoning process",
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
  },
  "claude-3-5-haiku-20241022-thinking": {
    id: "claude-3-5-haiku-20241022-thinking",
    provider: "anthropic",
    name: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku (Thinking)",
    description: "Ultra-fast model with visible reasoning process",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.0008,
      output: 0.004,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      thinking: true,
      pdfSupport: false,
    },
  },

  // Legacy model IDs for backward compatibility
  "claude-sonnet-4-20250514": {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    name: "claude-4-sonnet-20250514",
    displayName: "Claude 4 Sonnet (Legacy)",
    description: "Legacy model ID - use claude-4-sonnet-20250514 instead",
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
      defaultBudgetTokens: 15000,
    },
    deprecated: true,
    replacedBy: "claude-4-sonnet-20250514",
  },
  "claude-sonnet-4-20250514-thinking": {
    id: "claude-sonnet-4-20250514-thinking",
    provider: "anthropic",
    name: "claude-4-sonnet-20250514",
    displayName: "Claude 4 Sonnet (Thinking) (Legacy)",
    description:
      "Legacy model ID - use claude-4-sonnet-20250514-thinking instead",
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
      defaultBudgetTokens: 15000,
    },
    deprecated: true,
    replacedBy: "claude-4-sonnet-20250514-thinking",
  },
  "claude-3-haiku-20240307": {
    id: "claude-3-haiku-20240307",
    provider: "anthropic",
    name: "claude-3-haiku-20240307",
    displayName: "Claude 3 Haiku (Legacy)",
    description:
      "Legacy model ID - use claude-3-5-haiku-20241022 for latest Haiku",
    maxTokens: 200000,
    costPer1KTokens: {
      input: 0.00025,
      output: 0.00125,
    },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      pdfSupport: true,
    },
    deprecated: true,
    replacedBy: "claude-3-5-haiku-20241022",
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
