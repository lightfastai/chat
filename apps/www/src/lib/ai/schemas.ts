import { z } from "zod"

// Base schemas
export const ModelProviderSchema = z.enum(["openai", "anthropic", "openrouter"])
export type ModelProvider = z.infer<typeof ModelProviderSchema>

// Model feature schema
export const ModelFeaturesSchema = z.object({
  streaming: z.boolean(),
  functionCalling: z.boolean(),
  vision: z.boolean(),
  thinking: z.boolean().optional(),
  pdfSupport: z.boolean().optional(),
})
export type ModelFeatures = z.infer<typeof ModelFeaturesSchema>

// Thinking config schema
export const ThinkingConfigSchema = z.object({
  enabled: z.boolean(),
  defaultBudgetTokens: z.number(),
})
export type ThinkingConfig = z.infer<typeof ThinkingConfigSchema>

// Model configuration schema
export const ModelConfigSchema = z.object({
  id: z.string(),
  provider: ModelProviderSchema,
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  maxTokens: z.number(),
  costPer1KTokens: z.object({
    input: z.number(),
    output: z.number(),
  }),
  features: ModelFeaturesSchema,
  thinkingConfig: ThinkingConfigSchema.optional(),
  deprecated: z.boolean().optional(),
  replacedBy: z.string().optional(),
  hidden: z.boolean().optional(),
})
export type ModelConfig = z.infer<typeof ModelConfigSchema>

// Define all models in one place
export const MODELS = {
  // OpenAI models
  "gpt-4o-mini": ModelConfigSchema.parse({
    id: "gpt-4o-mini",
    provider: "openai",
    name: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    description: "Fast and efficient model for most tasks",
    maxTokens: 128000,
    costPer1KTokens: { input: 0.00015, output: 0.0006 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  }),
  "gpt-4o": ModelConfigSchema.parse({
    id: "gpt-4o",
    provider: "openai",
    name: "gpt-4o",
    displayName: "GPT-4o",
    description: "Most capable GPT-4 model with vision capabilities",
    maxTokens: 128000,
    costPer1KTokens: { input: 0.003, output: 0.01 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  }),
  "gpt-4.1": ModelConfigSchema.parse({
    id: "gpt-4.1",
    provider: "openai",
    name: "gpt-4.1",
    displayName: "GPT-4.1",
    description: "Enhanced GPT-4 with 1M token context for developers",
    maxTokens: 1000000,
    costPer1KTokens: { input: 0.01, output: 0.04 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  }),
  o3: ModelConfigSchema.parse({
    id: "o3",
    provider: "openai",
    name: "o3",
    displayName: "o3",
    description: "Most powerful reasoning model for complex problem-solving",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.002, output: 0.008 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  }),
  "gpt-4.1-mini": ModelConfigSchema.parse({
    id: "gpt-4.1-mini",
    provider: "openai",
    name: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    description: "Efficient GPT-4.1 model for everyday tasks",
    maxTokens: 128000,
    costPer1KTokens: { input: 0.00015, output: 0.0006 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  }),
  "gpt-4.1-nano": ModelConfigSchema.parse({
    id: "gpt-4.1-nano",
    provider: "openai",
    name: "gpt-4.1-nano",
    displayName: "GPT-4.1 Nano",
    description: "Ultra-efficient model for simple tasks with 1M context",
    maxTokens: 1000000,
    costPer1KTokens: { input: 0.0001, output: 0.0004 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  }),
  "o3-mini": ModelConfigSchema.parse({
    id: "o3-mini",
    provider: "openai",
    name: "o3-mini",
    displayName: "o3-mini",
    description: "Fast reasoning model for STEM tasks (deprecated)",
    maxTokens: 128000,
    costPer1KTokens: { input: 0.0011, output: 0.0044 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  }),
  "o4-mini": ModelConfigSchema.parse({
    id: "o4-mini",
    provider: "openai",
    name: "o4-mini-2025-04-16",
    displayName: "o4-mini",
    description: "Latest fast reasoning model excelling at math & STEM",
    maxTokens: 128000,
    costPer1KTokens: { input: 0.0011, output: 0.0044 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  }),
  "gpt-3.5-turbo": ModelConfigSchema.parse({
    id: "gpt-3.5-turbo",
    provider: "openai",
    name: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    description: "Fast, reliable model for simple tasks",
    maxTokens: 16385,
    costPer1KTokens: { input: 0.001, output: 0.002 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  }),

  // Anthropic models
  "claude-4-opus-20250514": ModelConfigSchema.parse({
    id: "claude-4-opus-20250514",
    provider: "anthropic",
    name: "claude-4-opus-20250514",
    displayName: "Claude 4 Opus",
    description: "Most powerful model for complex tasks",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.015, output: 0.075 },
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
    hidden: true,
  }),
  "claude-4-sonnet-20250514": ModelConfigSchema.parse({
    id: "claude-4-sonnet-20250514",
    provider: "anthropic",
    name: "claude-4-sonnet-20250514",
    displayName: "Claude 4 Sonnet",
    description: "Latest generation superior coding and reasoning model",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
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
  }),
  "claude-3-7-sonnet-20250219": ModelConfigSchema.parse({
    id: "claude-3-7-sonnet-20250219",
    provider: "anthropic",
    name: "claude-3-7-sonnet-20250219",
    displayName: "Claude 3.7 Sonnet",
    description: "Enhanced performance model with improved capabilities",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
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
  }),
  "claude-3-5-sonnet-20241022": ModelConfigSchema.parse({
    id: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    name: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    description: "Fast and capable model for most tasks",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      pdfSupport: true,
    },
  }),
  "claude-3-5-sonnet-20240620": ModelConfigSchema.parse({
    id: "claude-3-5-sonnet-20240620",
    provider: "anthropic",
    name: "claude-3-5-sonnet-20240620",
    displayName: "Claude 3.5 Sonnet (2024-06-20)",
    description: "Previous version of Claude 3.5 Sonnet",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      pdfSupport: true,
    },
    hidden: true,
  }),
  "claude-3-5-haiku-20241022": ModelConfigSchema.parse({
    id: "claude-3-5-haiku-20241022",
    provider: "anthropic",
    name: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku",
    description: "Ultra-fast model for lightweight tasks",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.0008, output: 0.004 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      pdfSupport: false,
    },
    hidden: true,
  }),

  // Thinking mode variants
  "claude-4-opus-20250514-thinking": ModelConfigSchema.parse({
    id: "claude-4-opus-20250514-thinking",
    provider: "anthropic",
    name: "claude-4-opus-20250514",
    displayName: "Claude 4 Opus (Thinking)",
    description: "Most powerful model with visible reasoning process",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.015, output: 0.075 },
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
    hidden: true,
  }),
  "claude-4-sonnet-20250514-thinking": ModelConfigSchema.parse({
    id: "claude-4-sonnet-20250514-thinking",
    provider: "anthropic",
    name: "claude-4-sonnet-20250514",
    displayName: "Claude 4 Sonnet (Thinking)",
    description: "Balanced model with visible reasoning process",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
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
  }),
  "claude-3-7-sonnet-20250219-thinking": ModelConfigSchema.parse({
    id: "claude-3-7-sonnet-20250219-thinking",
    provider: "anthropic",
    name: "claude-3-7-sonnet-20250219",
    displayName: "Claude 3.7 Sonnet (Thinking)",
    description: "Enhanced Claude 3.5 with visible reasoning process",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
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
  }),
  "claude-3-5-sonnet-20241022-thinking": ModelConfigSchema.parse({
    id: "claude-3-5-sonnet-20241022-thinking",
    provider: "anthropic",
    name: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet (Oct 2024) (Thinking)",
    description: "Latest Claude 3.5 with visible reasoning process",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      thinking: true,
      pdfSupport: true,
    },
    hidden: true,
  }),
  "claude-3-5-sonnet-20240620-thinking": ModelConfigSchema.parse({
    id: "claude-3-5-sonnet-20240620-thinking",
    provider: "anthropic",
    name: "claude-3-5-sonnet-20240620",
    displayName: "Claude 3.5 Sonnet (Jun 2024) (Thinking)",
    description: "Original Claude 3.5 with visible reasoning process",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      thinking: true,
      pdfSupport: true,
    },
    hidden: true,
  }),
  "claude-3-5-haiku-20241022-thinking": ModelConfigSchema.parse({
    id: "claude-3-5-haiku-20241022-thinking",
    provider: "anthropic",
    name: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku (Thinking)",
    description: "Ultra-fast model with visible reasoning process",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.0008, output: 0.004 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      thinking: true,
      pdfSupport: false,
    },
    hidden: true,
  }),

  // Legacy model IDs for backward compatibility
  "claude-sonnet-4-20250514": ModelConfigSchema.parse({
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    name: "claude-4-sonnet-20250514",
    displayName: "Claude 4 Sonnet (Legacy)",
    description: "Legacy model ID - use claude-4-sonnet-20250514 instead",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
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
    hidden: true,
  }),
  "claude-sonnet-4-20250514-thinking": ModelConfigSchema.parse({
    id: "claude-sonnet-4-20250514-thinking",
    provider: "anthropic",
    name: "claude-4-sonnet-20250514",
    displayName: "Claude 4 Sonnet (Thinking) (Legacy)",
    description:
      "Legacy model ID - use claude-4-sonnet-20250514-thinking instead",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
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
    hidden: true,
  }),
  "claude-3-haiku-20240307": ModelConfigSchema.parse({
    id: "claude-3-haiku-20240307",
    provider: "anthropic",
    name: "claude-3-haiku-20240307",
    displayName: "Claude 3 Haiku (Legacy)",
    description:
      "Legacy model ID - use claude-3-5-haiku-20241022 for latest Haiku",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.00025, output: 0.00125 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
      pdfSupport: true,
    },
    deprecated: true,
    replacedBy: "claude-3-5-haiku-20241022",
    hidden: true,
  }),

  // OpenRouter models
  "meta-llama/llama-3.3-70b-instruct": ModelConfigSchema.parse({
    id: "meta-llama/llama-3.3-70b-instruct",
    provider: "openrouter",
    name: "meta-llama/llama-3.3-70b-instruct",
    displayName: "Llama 3.3 70B",
    description: "Meta's latest and most capable open model",
    maxTokens: 131072,
    costPer1KTokens: { input: 0.00035, output: 0.0004 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
    hidden: true,
    deprecated: true,
  }),
  "anthropic/claude-3.5-sonnet": ModelConfigSchema.parse({
    id: "anthropic/claude-3.5-sonnet",
    provider: "openrouter",
    name: "anthropic/claude-3.5-sonnet",
    displayName: "Claude 3.5 Sonnet (via OpenRouter)",
    description: "Claude 3.5 Sonnet through OpenRouter",
    maxTokens: 200000,
    costPer1KTokens: { input: 0.003, output: 0.015 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    hidden: true,
    deprecated: true,
  }),
  "openai/gpt-4o": ModelConfigSchema.parse({
    id: "openai/gpt-4o",
    provider: "openrouter",
    name: "openai/gpt-4o",
    displayName: "GPT-4o (via OpenRouter)",
    description: "GPT-4o through OpenRouter",
    maxTokens: 128000,
    costPer1KTokens: { input: 0.0025, output: 0.01 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    hidden: true,
    deprecated: true,
  }),
  "google/gemini-pro-1.5": ModelConfigSchema.parse({
    id: "google/gemini-pro-1.5",
    provider: "openrouter",
    name: "google/gemini-pro-1.5",
    displayName: "Gemini 1.5 Pro",
    description: "Google's advanced multimodal model",
    maxTokens: 2097152,
    costPer1KTokens: { input: 0.00125, output: 0.005 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    hidden: true,
    deprecated: true,
  }),
  "mistralai/mistral-large": ModelConfigSchema.parse({
    id: "mistralai/mistral-large",
    provider: "openrouter",
    name: "mistralai/mistral-large",
    displayName: "Mistral Large",
    description:
      "Mistral's flagship model with strong multilingual capabilities",
    maxTokens: 128000,
    costPer1KTokens: { input: 0.002, output: 0.006 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
    hidden: true,
    deprecated: true,
  }),
  "x-ai/grok-3-beta": ModelConfigSchema.parse({
    id: "x-ai/grok-3-beta",
    provider: "openrouter",
    name: "x-ai/grok-3-beta",
    displayName: "Grok 3",
    description: "xAI's most powerful reasoning model for complex tasks",
    maxTokens: 131072,
    costPer1KTokens: { input: 3.0, output: 15.0 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    hidden: true,
  }),
  "x-ai/grok-3-mini-beta": ModelConfigSchema.parse({
    id: "x-ai/grok-3-mini-beta",
    provider: "openrouter",
    name: "x-ai/grok-3-mini-beta",
    displayName: "Grok 3 Mini",
    description:
      "Fast and efficient reasoning model for math and quantitative tasks",
    maxTokens: 131072,
    costPer1KTokens: { input: 0.3, output: 0.5 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  }),
  "google/gemini-2.5-pro-preview": ModelConfigSchema.parse({
    id: "google/gemini-2.5-pro-preview",
    provider: "openrouter",
    name: "google/gemini-2.5-pro-preview",
    displayName: "Gemini 2.5 Pro",
    description:
      "Google's most advanced model for complex reasoning and coding",
    maxTokens: 1048576,
    costPer1KTokens: { input: 1.25, output: 10.0 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
    hidden: true,
  }),
  "google/gemini-2.5-flash-preview": ModelConfigSchema.parse({
    id: "google/gemini-2.5-flash-preview",
    provider: "openrouter",
    name: "google/gemini-2.5-flash-preview",
    displayName: "Gemini 2.5 Flash",
    description:
      "Google's state-of-the-art workhorse model for reasoning and coding",
    maxTokens: 1048576,
    costPer1KTokens: { input: 0.15, output: 0.6 },
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
    },
  }),
} as const

// Type validation to ensure model IDs match their keys is done at schema parse time

// Export derived types
export type ModelId = keyof typeof MODELS

// Utility types for provider-specific models
export type ModelsForProvider<P extends ModelProvider> = {
  [K in ModelId]: (typeof MODELS)[K]["provider"] extends P ? K : never
}[ModelId]

export type OpenAIModelId = ModelsForProvider<"openai">
export type AnthropicModelId = ModelsForProvider<"anthropic">
export type OpenRouterModelId = ModelsForProvider<"openrouter">

// API key validation schemas
export const OpenAIKeySchema = z
  .string()
  .min(1)
  .regex(/^sk-[a-zA-Z0-9]{48,}$/, "Invalid OpenAI API key format")

export const AnthropicKeySchema = z
  .string()
  .min(1)
  .regex(/^sk-ant-[a-zA-Z0-9]{90,}$/, "Invalid Anthropic API key format")

export const OpenRouterKeySchema = z
  .string()
  .min(1)
  .regex(/^sk-or-[a-zA-Z0-9]{50,}$/, "Invalid OpenRouter API key format")

// Validation function
export function validateApiKey(provider: ModelProvider, key: string) {
  const schemas = {
    openai: OpenAIKeySchema,
    anthropic: AnthropicKeySchema,
    openrouter: OpenRouterKeySchema,
  }

  return schemas[provider].safeParse(key)
}

// Export collections
export const ALL_MODEL_IDS = Object.keys(MODELS) as ModelId[]
export const OPENAI_MODEL_IDS = ALL_MODEL_IDS.filter(
  (id) => MODELS[id].provider === "openai",
) as OpenAIModelId[]
export const ANTHROPIC_MODEL_IDS = ALL_MODEL_IDS.filter(
  (id) => MODELS[id].provider === "anthropic",
) as AnthropicModelId[]
export const OPENROUTER_MODEL_IDS = ALL_MODEL_IDS.filter(
  (id) => MODELS[id].provider === "openrouter",
) as OpenRouterModelId[]

// Helper functions
export function getModelConfig(modelId: ModelId): ModelConfig {
  return MODELS[modelId]
}

export function getModelsForProvider(provider: ModelProvider): ModelConfig[] {
  return Object.values(MODELS).filter((model) => model.provider === provider)
}

export function getVisibleModels(): ModelConfig[] {
  return Object.values(MODELS).filter((model) => !model.hidden)
}

export function getDeprecatedModels(): ModelConfig[] {
  return Object.values(MODELS).filter((model) => model.deprecated)
}

export function getLegacyModelMapping(): Record<string, string> {
  const mapping: Record<string, string> = {}

  for (const model of Object.values(MODELS)) {
    if (model.deprecated && model.replacedBy) {
      mapping[model.id] = model.replacedBy
    }
  }

  return mapping
}

// Default model ID
export const DEFAULT_MODEL_ID: ModelId = "gpt-4o-mini"

// Additional utility functions
export function getAllModelsIncludingHidden(): ModelConfig[] {
  return Object.values(MODELS)
}

export function getModelDisplayName(modelId: string): string {
  const model = MODELS[modelId as ModelId]
  return model?.displayName ?? "Unknown Model"
}

export function modelSupportsFeature(
  modelId: string,
  feature: keyof ModelFeatures,
): boolean {
  const model = MODELS[modelId as ModelId]
  return model?.features[feature] ?? false
}

// Additional types and interfaces
export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ModelSelectionProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export interface AIGenerationOptions {
  modelId: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

// Legacy type aliases for backward compatibility
export type OpenAIModel = OpenAIModelId
export type AnthropicModel = AnthropicModelId
export type OpenRouterModel = OpenRouterModelId

// Provider constants
export const MODEL_PROVIDERS = ["openai", "anthropic", "openrouter"] as const

// Type-safe model ID validation
export function isValidModelId(modelId: string): modelId is ModelId {
  return (ALL_MODEL_IDS as readonly string[]).includes(modelId)
}

// Extract provider from modelId (type-safe)
export function getProviderFromModelId(modelId: ModelId): ModelProvider {
  const model = getModelConfig(modelId)
  return model.provider
}

// Get actual model name for API calls (removes -thinking suffix)
export function getActualModelName(modelId: ModelId): string {
  const model = getModelConfig(modelId)
  return model.name
}

// Check if model is in thinking mode
export function isThinkingMode(modelId: ModelId): boolean {
  const model = getModelConfig(modelId)
  return (
    model.features.thinking === true && model.thinkingConfig?.enabled === true
  )
}

// Legacy model collections for backward compatibility
export const OPENAI_MODELS: Record<string, ModelConfig> = Object.fromEntries(
  getModelsForProvider("openai").map((model) => [model.id, model]),
)

export const ANTHROPIC_MODELS: Record<string, ModelConfig> = Object.fromEntries(
  getModelsForProvider("anthropic").map((model) => [model.id, model]),
)

export const OPENROUTER_MODELS: Record<string, ModelConfig> =
  Object.fromEntries(
    getModelsForProvider("openrouter").map((model) => [model.id, model]),
  )

// Re-export the complete models object for backward compatibility
export const ALL_MODELS = MODELS

// Legacy function aliases for backward compatibility (deprecated)
export const getModelsByProvider = getModelsForProvider
export const getAllModels = getVisibleModels
export const getModelById = getModelConfig
