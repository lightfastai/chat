/**
 * AI Model Types and Configurations
 */

export type ModelProvider = "openai" | "anthropic"

export type OpenAIModel = "gpt-4o-mini" | "gpt-4o" | "gpt-3.5-turbo"
export type AnthropicModel =
  | "claude-sonnet-4-20250514"
  | "claude-sonnet-4-20250514-thinking"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-haiku-20240307"

export type ModelId = OpenAIModel | AnthropicModel

export interface ModelConfig {
  id: string
  provider: ModelProvider
  name: string
  displayName: string
  description: string
  maxTokens: number
  costPer1KTokens: {
    input: number
    output: number
  }
  features: {
    streaming: boolean
    functionCalling: boolean
    vision: boolean
    thinking?: boolean
    pdfSupport?: boolean
  }
  thinkingConfig?: {
    enabled: boolean
    defaultBudgetTokens: number
  }
}

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

// Shared validation helpers for Convex
export const MODEL_PROVIDERS = ["openai", "anthropic"] as const
export const OPENAI_MODEL_IDS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-3.5-turbo",
] as const
export const ANTHROPIC_MODEL_IDS = [
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-20250514-thinking",
  "claude-3-5-sonnet-20241022",
  "claude-3-haiku-20240307",
] as const
export const ALL_MODEL_IDS = [
  ...OPENAI_MODEL_IDS,
  ...ANTHROPIC_MODEL_IDS,
] as const

// Type-safe model ID validation
export function isValidModelId(modelId: string): modelId is ModelId {
  return (ALL_MODEL_IDS as readonly string[]).includes(modelId)
}

// Extract provider from modelId (type-safe)
export function getProviderFromModelId(modelId: ModelId): ModelProvider {
  if ((OPENAI_MODEL_IDS as readonly string[]).includes(modelId)) {
    return "openai"
  }
  if ((ANTHROPIC_MODEL_IDS as readonly string[]).includes(modelId)) {
    return "anthropic"
  }
  throw new Error(`Unknown model ID: ${modelId}`)
}

// Get actual model name for API calls (removes -thinking suffix)
export function getActualModelName(modelId: ModelId): string {
  return modelId.replace("-thinking", "")
}

// Check if model is in thinking mode
export function isThinkingMode(modelId: ModelId): boolean {
  return modelId.includes("-thinking")
}
