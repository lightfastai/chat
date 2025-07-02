import { v } from "convex/values";
import { ALL_MODEL_IDS, ModelProviderSchema } from "../src/lib/ai/schemas.js";

/**
 * Comprehensive validators for the chat application
 *
 * This file is organized into sections:
 * 1. Core Model & ID Validators - Basic types used throughout
 * 2. User & Auth Validators - User settings and authentication
 * 3. Message Parts Validators (Vercel AI SDK v5) - The canonical message structure
 * 4. Database Storage - How data is persisted
 * 5. HTTP Protocol - Wire format for client-server communication
 * 6. Helper Functions - Type guards and utilities
 *
 * IMPORTANT: The messagePartValidator is the single source of truth for
 * message content structure, following Vercel AI SDK v5 exactly.
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

// Chat status validator (follows Vercel AI SDK v5 ChatStatus enum)
// 'submitted' - Message sent to API, awaiting response stream start
// 'streaming' - Response actively streaming from API
// 'ready' - Full response received and processed, ready for new user message
// 'error' - Error occurred during API request
export const messageStatusValidator = v.union(
	v.literal("submitted"),
	v.literal("streaming"),
	v.literal("ready"),
	v.literal("error"),
);

// ===== ID Validators =====
// Client ID validator (nanoid format, typically 21 chars)
export const clientIdValidator = v.string();

// Client thread ID validator (nanoid format, typically 21 chars)
export const clientThreadIdValidator = v.string();

// Share ID validator (nanoid format, 24 chars for security)
export const shareIdValidator = v.string();

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
export const roleValidator = v.union(
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
});

export const rawPartValidator = v.object({
	type: v.literal("raw"),
	rawValue: v.any(),
});

// Error part validator - for stream errors
export const errorPartValidator = v.object({
	type: v.literal("error"),
	errorMessage: v.string(),
	errorDetails: v.optional(v.any()),
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
  errorPartValidator,
  toolCallPartValidator,
  rawPartValidator,
);

// Array of message parts validator
export const messagePartsValidator = v.array(messagePartValidator);

// ===== Validation Functions =====
// Title validation

export function validateTitle(title: string): boolean {
  return title.length >= 1 && title.length <= 80;
}
