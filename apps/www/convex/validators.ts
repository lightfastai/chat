import { v } from "convex/values";
import { ALL_MODEL_IDS, ModelProviderSchema } from "../src/lib/ai/schemas.js";

/**
 * Shared validators for type safety across Convex functions
 *
 * These validators ensure consistent data validation and provide
 * better type inference throughout the backend.
 */

// ===== Model Validators =====
// Model ID validator for all supported AI models (auto-synced from schemas)
export const modelIdValidator = v.union(
	...ALL_MODEL_IDS.map((id) => v.literal(id)),
);

// Model provider validator (auto-synced from schemas)
export const modelProviderValidator = v.union(
	...ModelProviderSchema.options.map((provider) => v.literal(provider)),
);

// ===== ID Validators =====
// Client ID validator (nanoid format, typically 21 chars)
export const clientIdValidator = v.string();

// Share ID validator (nanoid format, 24 chars for security)
export const shareIdValidator = v.string();

// Stream ID validator (format: stream_<timestamp>_<random>)
export const streamIdValidator = v.string();

// Chunk ID validator (format: chunk_<timestamp>_<random>)
export const chunkIdValidator = v.string();

// Storage ID validator for Convex file storage
export const storageIdValidator = v.string();

// ===== String Format Validators =====
// Email validator with basic format checking
export const emailValidator = v.string();

// URL validator for links and images
export const urlValidator = v.string();

// Phone number validator
export const phoneValidator = v.optional(v.string());

// API key validators with provider-specific patterns
export const openaiApiKeyValidator = v.string(); // sk-...
export const anthropicApiKeyValidator = v.string(); // sk-ant-...
export const openrouterApiKeyValidator = v.string();

// ===== Content Validators =====
// Title validator with max length
export const titleValidator = v.string(); // Max 80 chars enforced in handler

// User name validator
export const userNameValidator = v.string();

// Comment/feedback validator with reasonable length
export const commentValidator = v.optional(v.string());

// ===== Share & Access Validators =====
// IP hash validator for rate limiting
export const ipHashValidator = v.optional(v.string());

// User agent validator for logging
export const userAgentValidator = v.optional(v.string());

// Share settings validator
export const shareSettingsValidator = v.optional(
	v.object({
		showThinking: v.optional(v.boolean()),
	}),
);

// ===== Message & Stream Validators =====
// Message type validator
export const messageTypeValidator = v.union(
	v.literal("user"),
	v.literal("assistant"),
	v.literal("system"),
);

// Token usage validator
export const tokenUsageValidator = v.optional(
	v.object({
		inputTokens: v.optional(v.number()),
		outputTokens: v.optional(v.number()),
		totalTokens: v.optional(v.number()),
		reasoningTokens: v.optional(v.number()),
		cachedInputTokens: v.optional(v.number()),
		// Legacy fields for compatibility
		promptTokens: v.optional(v.number()),
		completionTokens: v.optional(v.number()),
		cacheHitTokens: v.optional(v.number()),
		cacheWriteTokens: v.optional(v.number()),
	}),
);

// ===== File Validators =====
// File name validator
export const fileNameValidator = v.string();

// MIME type validator
export const mimeTypeValidator = v.string();

// File metadata validator
export const fileMetadataValidator = v.optional(
	v.object({
		extracted: v.optional(v.boolean()),
		extractedText: v.optional(v.string()),
		pageCount: v.optional(v.number()),
		dimensions: v.optional(
			v.object({
				width: v.number(),
				height: v.number(),
			}),
		),
	}),
);

// ===== Feedback Validators =====
// Feedback rating validator
export const feedbackRatingValidator = v.union(
	v.literal("thumbs_up"),
	v.literal("thumbs_down"),
);

// Feedback reasons validator
export const feedbackReasonsValidator = v.optional(
	v.array(
		v.union(
			v.literal("helpful"),
			v.literal("accurate"),
			v.literal("clear"),
			v.literal("creative"),
			v.literal("not_helpful"),
			v.literal("inaccurate"),
			v.literal("unclear"),
			v.literal("repetitive"),
			v.literal("incomplete"),
			v.literal("off_topic"),
		),
	),
);

// ===== Thread Validators =====
// Branch info validator
export const branchInfoValidator = v.optional(
	v.object({
		threadId: v.id("threads"),
		messageId: v.id("messages"),
		timestamp: v.number(),
	}),
);

// Thread usage validator
export const threadUsageValidator = v.optional(
	v.object({
		totalInputTokens: v.number(),
		totalOutputTokens: v.number(),
		totalTokens: v.number(),
		totalReasoningTokens: v.number(),
		totalCachedInputTokens: v.number(),
		messageCount: v.number(),
		modelStats: v.optional(
			v.record(
				v.string(),
				v.object({
					inputTokens: v.number(),
					outputTokens: v.number(),
					totalTokens: v.number(),
					reasoningTokens: v.optional(v.number()),
					cachedInputTokens: v.optional(v.number()),
					messageCount: v.number(),
				}),
			),
		),
	}),
);

// ===== User Settings Validators =====
// User API keys validator
export const userApiKeysValidator = v.optional(
	v.object({
		openai: v.optional(v.string()),
		anthropic: v.optional(v.string()),
		openrouter: v.optional(v.string()),
	}),
);

// User preferences validator
export const userPreferencesValidator = v.optional(
	v.object({
		defaultModel: v.optional(modelIdValidator),
		preferredProvider: v.optional(modelProviderValidator),
	}),
);

// ===== Message Parts Validators (Vercel AI SDK v5) =====
// Text part validator - represents a text segment in a message
export const textPartValidator = v.object({
	type: v.literal("text"),
	text: v.string(),
});

// Reasoning part validator - for Claude thinking/reasoning content
export const reasoningPartValidator = v.object({
	type: v.literal("reasoning"),
	text: v.string(),
	providerMetadata: v.optional(v.any()),
});

// File part validator - for generated files
export const filePartValidator = v.object({
	type: v.literal("file"),
	url: v.optional(v.string()),
	mediaType: v.string(),
	data: v.optional(v.any()), // Base64 or binary data
	filename: v.optional(v.string()),
});

// Source part validator - for citations and references
export const sourcePartValidator = v.object({
	type: v.literal("source"),
	sourceType: v.union(v.literal("url"), v.literal("document")),
	sourceId: v.string(),
	url: v.optional(v.string()),
	title: v.optional(v.string()),
	mediaType: v.optional(v.string()),
	filename: v.optional(v.string()),
	metadata: v.optional(v.any()),
});

// Error part validator - for stream errors
export const errorPartValidator = v.object({
	type: v.literal("error"),
	errorMessage: v.string(),
	errorDetails: v.optional(v.any()),
});

// Raw part validator - for debugging raw provider responses
export const rawPartValidator = v.object({
	type: v.literal("raw"),
	rawValue: v.any(),
});

// Step part validator - for multi-step generation boundaries
export const stepPartValidator = v.object({
	type: v.literal("step"),
	stepType: v.union(v.literal("start-step"), v.literal("finish-step")),
});

// Stream control part validator - for start/finish/metadata events
export const streamControlPartValidator = v.object({
	type: v.literal("control"),
	controlType: v.union(
		v.literal("start"),
		v.literal("finish"),
		v.literal("reasoning-part-finish")
	),
	finishReason: v.optional(v.string()),
	totalUsage: v.optional(v.any()),
	metadata: v.optional(v.any()),
});

// Tool call part validator - Official Vercel AI SDK v5 compliant
export const toolCallPartValidator = v.object({
	type: v.literal("tool-call"),
	toolCallId: v.string(),
	toolName: v.string(),
	args: v.optional(v.any()),
	result: v.optional(v.any()),
	state: v.union(
		v.literal("partial-call"), // Tool call in progress (streaming args)
		v.literal("call"), // Completed tool call (ready for execution)
		v.literal("result"), // Tool execution completed with results
	),
	step: v.optional(v.number()), // Official SDK step tracking for multi-step calls
});

// Message part union validator - represents any type of message part
export const messagePartValidator = v.union(
	textPartValidator,
	reasoningPartValidator,
	filePartValidator,
	sourcePartValidator,
	errorPartValidator,
	rawPartValidator,
	stepPartValidator,
	streamControlPartValidator,
	toolCallPartValidator,
);

// Array of message parts validator
export const messagePartsValidator = v.array(messagePartValidator);

// ===== Validation Functions =====
// Title validation function
export function validateTitle(title: string): boolean {
	return title.length >= 1 && title.length <= 80;
}
