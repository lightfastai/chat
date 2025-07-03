import type { ModelId } from "../../src/lib/ai/schemas.js";

/**
 * Model-specific streaming delay configuration
 *
 * Different models have different streaming characteristics:
 * - Faster models need longer delays to be readable
 * - Slower models can use shorter delays
 * - Thinking models need balanced delays for reasoning readability
 */
export const MODEL_STREAMING_DELAYS: Record<ModelId, number> = {
	// OpenAI Models
	"gpt-4o-mini": 20, // Fast model, needs longer delay
	"gpt-4o": 15, // Balanced speed
	"gpt-4.1": 12, // Powerful model, can use shorter delay
	"gpt-4.1-mini": 18, // Efficient model, moderate delay
	"gpt-4.1-nano": 25, // Ultra-fast, needs longest delay
	o3: 10, // Most powerful reasoning model, shorter delay
	"o3-mini": 22, // Fast reasoning model, longer delay
	"o4-mini": 20, // Fast STEM model, longer delay
	"gpt-3.5-turbo": 18, // Legacy fast model

	// Anthropic Models
	"claude-4-opus-20250514": 10, // Most powerful, shorter delay
	"claude-4-sonnet-20250514": 12, // Powerful model, shorter delay
	"claude-3-7-sonnet-20250219": 15, // Balanced performance
	"claude-3-5-sonnet-20241022": 15, // Fast and capable, balanced delay
	"claude-3-5-sonnet-20240620": 15, // Previous version, same characteristics
	"claude-3-5-haiku-20241022": 22, // Ultra-fast, needs longer delay
	"claude-3-haiku-20240307": 22, // Legacy haiku model

	// Anthropic Thinking Models (slightly longer for reasoning readability)
	"claude-4-opus-20250514-thinking": 18,
	"claude-4-sonnet-20250514-thinking": 18,
	"claude-3-7-sonnet-20250219-thinking": 20,
	"claude-3-5-sonnet-20241022-thinking": 20,
	"claude-3-5-sonnet-20240620-thinking": 20,
	"claude-3-5-haiku-20241022-thinking": 25,

	// Anthropic Legacy Models
	"claude-sonnet-4-20250514": 12, // Same as claude-4-sonnet
	"claude-sonnet-4-20250514-thinking": 18,

	// OpenRouter Models
	"x-ai/grok-3-mini-beta": 20, // Fast reasoning model
	"x-ai/grok-3-beta": 10, // Powerful model
	"google/gemini-2.5-flash-preview": 15, // Balanced workhorse model
	"google/gemini-2.5-pro-preview": 10, // Powerful model
	"google/gemini-pro-1.5": 12, // Previous gen powerful model
	"meta-llama/llama-3.3-70b-instruct": 12, // Powerful model
	"anthropic/claude-3.5-sonnet": 15, // OpenRouter Claude
	"openai/gpt-4o": 15, // OpenRouter GPT-4o
	"mistralai/mistral-large": 12, // Powerful model
};

/**
 * Get the optimal streaming delay for a given model
 * @param modelId The model ID
 * @returns The delay in milliseconds (defaults to 15ms if model not found)
 */
export function getModelStreamingDelay(modelId: ModelId): number {
	return MODEL_STREAMING_DELAYS[modelId] ?? 15;
}

/**
 * Streaming configuration presets
 */
export const STREAMING_PRESETS = {
	ultraFast: { delayInMs: 25, chunking: "word" as const },
	fast: { delayInMs: 20, chunking: "word" as const },
	balanced: { delayInMs: 15, chunking: "word" as const },
	powerful: { delayInMs: 10, chunking: "word" as const },
	thinking: { delayInMs: 18, chunking: "word" as const },
} as const;
