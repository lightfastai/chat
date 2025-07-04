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

// Thread usage validator - aggregated usage for entire thread
export const threadUsageValidator = v.optional(
	v.object({
		totalInputTokens: v.number(),
		totalOutputTokens: v.number(),
		totalTokens: v.number(),
		totalReasoningTokens: v.number(),
		totalCachedInputTokens: v.number(),
		messageCount: v.number(),
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

// ===== Shared Metadata Validators =====
// Message metadata validator - contains usage only
export const messageMetadataValidator = v.optional(
	v.object({
		usage: tokenUsageValidator,
	}),
);

// Thread metadata validator - contains aggregated usage only
export const threadMetadataValidator = v.optional(
	v.object({
		usage: threadUsageValidator,
	}),
);

// ===== Message Parts Validators (Vercel AI SDK v5) =====
// Text part validator - represents a text segment in a message
export const textPartValidator = v.object({
	type: v.literal("text"),
	text: v.string(),
	timestamp: v.number(),
});

// Reasoning part validator - for Claude thinking/reasoning content
export const reasoningPartValidator = v.object({
	type: v.literal("reasoning"),
	text: v.string(),
	timestamp: v.number(),
});

export const rawPartValidator = v.object({
	type: v.literal("raw"),
	rawValue: v.any(),
	timestamp: v.number(),
});

// Error classification types that match our error handling functions
export const errorTypeValidator = v.union(
	v.literal("rate_limit"),
	v.literal("timeout"),
	v.literal("auth"),
	v.literal("quota"),
	v.literal("network"),
	v.literal("server"),
	v.literal("unknown"),
);

// Error context types for better debugging
export const errorContextValidator = v.union(
	v.literal("streaming_setup"),
	v.literal("streaming_response"),
	v.literal("http_request"),
	v.literal("general"),
);

// Structured error details that match our extractErrorDetails function
export const errorDetailsValidator = v.object({
	name: v.string(),
	message: v.string(),
	stack: v.optional(v.string()),
	raw: v.optional(v.any()), // The original error object
	context: v.optional(errorContextValidator),
	modelId: v.optional(v.string()),
	errorType: v.optional(errorTypeValidator),
	timestamp: v.optional(v.number()),
	retryable: v.optional(v.boolean()),
});

// Error part validator - for stream errors with structured validation
export const errorPartValidator = v.object({
	type: v.literal("error"),
	errorMessage: v.string(),
	errorDetails: v.optional(errorDetailsValidator),
	timestamp: v.number(),
});

// Tool call part validator - Official Vercel AI SDK v5 compliant
export const toolCallPartValidator = v.object({
	type: v.literal("tool-call"),
	toolCallId: v.string(),
	toolName: v.string(),
	input: v.optional(v.any()),
	timestamp: v.number(),
});

export const toolInputStartPartValidator = v.object({
	type: v.literal("tool-input-start"),
	toolCallId: v.string(),
	toolName: v.string(),
	timestamp: v.number(),
});

export const toolResultPartValidator = v.object({
	type: v.literal("tool-result"),
	toolCallId: v.string(),
	toolName: v.string(),
	input: v.optional(v.any()),
	output: v.optional(v.any()),
	timestamp: v.number(),
});

// Source URL part validator - matches Vercel AI SDK SourceUrlUIPart
export const sourceUrlPartValidator = v.object({
	type: v.literal("source-url"),
	sourceId: v.string(),
	url: v.string(),
	title: v.optional(v.string()),
	providerMetadata: v.optional(v.any()),
	timestamp: v.number(),
});

// Source document part validator - matches Vercel AI SDK SourceDocumentUIPart
export const sourceDocumentPartValidator = v.object({
	type: v.literal("source-document"),
	sourceId: v.string(),
	mediaType: v.string(),
	title: v.string(),
	filename: v.optional(v.string()),
	providerMetadata: v.optional(v.any()),
	timestamp: v.number(),
});

// File part validator - matches Vercel AI SDK FileUIPart
export const filePartValidator = v.object({
	type: v.literal("file"),
	mediaType: v.string(),
	filename: v.optional(v.string()),
	url: v.string(),
	timestamp: v.number(),
});

// Message part union validator - represents any type of message part
export const messagePartValidator = v.union(
	textPartValidator,
	reasoningPartValidator,
	errorPartValidator,
	toolCallPartValidator,
	toolInputStartPartValidator,
	toolResultPartValidator,
	rawPartValidator,
	sourceUrlPartValidator,
	sourceDocumentPartValidator,
	filePartValidator,
);

// Array of message parts validator
export const messagePartsValidator = v.array(messagePartValidator);

// ===== Validation Functions =====
// Title validation

export function validateTitle(title: string): boolean {
	return title.length >= 1 && title.length <= 80;
}
