/**
 * AI Model Types and Configurations
 */

export type ModelProvider = "openai" | "anthropic" | "openrouter"

export type OpenAIModel =
  | "gpt-4o-mini"
  | "gpt-4o"
  | "gpt-4.1"
  | "o3"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "o3-mini"
  | "o4-mini"
  | "gpt-3.5-turbo"
export type AnthropicModel =
  | "claude-4-opus-20250514"
  | "claude-4-sonnet-20250514"
  | "claude-3-7-sonnet-20250219"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-sonnet-20240620"
  | "claude-3-5-haiku-20241022"

export type OpenRouterModel =
  | "meta-llama/llama-3.3-70b-instruct"
  | "anthropic/claude-3.5-sonnet"
  | "openai/gpt-4o"
  | "google/gemini-pro-1.5"
  | "mistralai/mistral-large"

export type ModelId = OpenAIModel | AnthropicModel | OpenRouterModel

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
export const MODEL_PROVIDERS = ["openai", "anthropic", "openrouter"] as const
export const OPENAI_MODEL_IDS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1",
  "o3",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "o3-mini",
  "o4-mini",
  "gpt-3.5-turbo",
] as const
export const ANTHROPIC_MODEL_IDS = [
  "claude-4-opus-20250514",
  "claude-4-sonnet-20250514",
  "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-5-haiku-20241022",
] as const
export const OPENROUTER_MODEL_IDS = [
  "meta-llama/llama-3.3-70b-instruct",
  "anthropic/claude-3.5-sonnet",
  "openai/gpt-4o",
  "google/gemini-pro-1.5",
  "mistralai/mistral-large",
] as const
export const ALL_MODEL_IDS = [
  ...OPENAI_MODEL_IDS,
  ...ANTHROPIC_MODEL_IDS,
  ...OPENROUTER_MODEL_IDS,
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
  if ((OPENROUTER_MODEL_IDS as readonly string[]).includes(modelId)) {
    return "openrouter"
  }
  throw new Error(`Unknown model ID: ${modelId}`)
}

// Get actual model name for API calls (removes -thinking or -reasoning suffix)
export function getActualModelName(modelId: ModelId): string {
  return modelId.replace("-thinking", "").replace("-reasoning", "")
}

// Check if model is in thinking/reasoning mode
export function isThinkingMode(modelId: ModelId): boolean {
  return modelId.includes("-thinking") || modelId.includes("-reasoning")
}
