import { ModelConfigSchema } from "../schemas";

/**
 * Deprecated AI Models
 *
 * These models are no longer recommended but are kept for backward compatibility.
 * All deprecated models have `active: false` to hide them from the UI.
 * They remain functional to support existing conversations and threads.
 */
export const DEPRECATED_MODELS = {
	// ===== Legacy Model IDs =====
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
		streamingDelay: 12,
		active: false,
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
		streamingDelay: 18,
		active: false,
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
			thinking: false,
			pdfSupport: true,
		},
		streamingDelay: 22,
		active: false,
	}),

	// ===== OpenRouter Duplicate Models =====
	// These are available directly through native providers, no need for OpenRouter
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
			thinking: false,
			pdfSupport: false,
		},
		streamingDelay: 12,

		active: false,
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
			thinking: false,
			pdfSupport: false,
		},
		streamingDelay: 15,

		active: false,
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
			thinking: false,
			pdfSupport: false,
		},
		streamingDelay: 15,

		active: false,
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
			thinking: false,
			pdfSupport: false,
		},
		streamingDelay: 12,

		active: false,
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
			thinking: false,
			pdfSupport: true, // Through Document AI API
		},
		streamingDelay: 12,

		active: false,
	}),
} as const;
