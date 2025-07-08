import { z } from "zod";

// Base schemas
export const ModelProviderSchema = z.enum([
	"openai",
	"anthropic",
	"openrouter",
]);
export type ModelProvider = z.infer<typeof ModelProviderSchema>;

// Model feature schema
export const ModelFeaturesSchema = z.object({
	streaming: z.boolean(),
	functionCalling: z.boolean(),
	vision: z.boolean(),
	thinking: z.boolean(),
	pdfSupport: z.boolean(),
});
export type ModelFeatures = z.infer<typeof ModelFeaturesSchema>;

// Thinking config schema
export const ThinkingConfigSchema = z.object({
	enabled: z.boolean(),
	defaultBudgetTokens: z.number(),
});
export type ThinkingConfig = z.infer<typeof ThinkingConfigSchema>;

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
	active: z.boolean().default(true),
	streamingDelay: z
		.number()
		.optional()
		.describe("Streaming delay in milliseconds for optimal readability"),
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// Placeholder type - will be overridden by the actual model IDs from MODELS
export type ModelId = string;

// API key validation schemas
export const OpenAIKeySchema = z
	.string()
	.min(1)
	.regex(/^sk-[a-zA-Z0-9]{48,}$/, "Invalid OpenAI API key format");

export const AnthropicKeySchema = z
	.string()
	.min(1)
	.regex(/^sk-ant-[a-zA-Z0-9]{90,}$/, "Invalid Anthropic API key format");

export const OpenRouterKeySchema = z
	.string()
	.min(1)
	.regex(/^sk-or-[a-zA-Z0-9]{50,}$/, "Invalid OpenRouter API key format");

// Validation function
export function validateApiKey(provider: ModelProvider, key: string) {
	const schemas = {
		openai: OpenAIKeySchema,
		anthropic: AnthropicKeySchema,
		openrouter: OpenRouterKeySchema,
	};

	return schemas[provider].safeParse(key);
}
