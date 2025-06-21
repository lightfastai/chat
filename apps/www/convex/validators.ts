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

// Stream chunk validator - backward compatible with old "id" field
export const streamChunkValidator = v.object({
	// Support both old "id" field and new "chunkId" field for backward compatibility
	chunkId: v.optional(chunkIdValidator),
	id: v.optional(chunkIdValidator), // Legacy field from before PR #195
	content: v.string(),
	timestamp: v.number(),
	sequence: v.optional(v.number()), // Legacy field from before PR #195
	isThinking: v.optional(v.boolean()),
});

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

// ===== Validation Functions =====
// Title validation function
export function validateTitle(title: string): boolean {
	return title.length >= 1 && title.length <= 80;
}
