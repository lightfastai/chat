import { v } from "convex/values";
import type { Infer } from "convex/values";
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
export const chatStatusValidator = v.union(
	v.literal("submitted"),
	v.literal("streaming"),
	v.literal("ready"),
	v.literal("error"),
);

// ===== ID Validators =====
// Client ID validator (nanoid format, typically 21 chars)
export const clientIdValidator = v.string();

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
	url: v.string(), // Required for Vercel AI SDK compatibility
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

// Control part validator - for streaming control messages
export const controlPartValidator = v.object({
	type: v.literal("control"),
	controlType: v.string(), // e.g. "finish"
	finishReason: v.optional(v.string()), // e.g. "stop"
	totalUsage: v.optional(
		v.object({
			inputTokens: v.number(),
			outputTokens: v.number(),
			totalTokens: v.number(),
			reasoningTokens: v.number(),
			cachedInputTokens: v.number(),
		}),
	),
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
	toolCallPartValidator,
	controlPartValidator,
);

// Array of message parts validator
export const messagePartsValidator = v.array(messagePartValidator);

// SECTION 4: DATABASE STORAGE VALIDATORS
// =========================================================================
/**
 * These validators define how streaming data is persisted in the database.
 * We store:
 * 1. Stream records - track overall stream state
 * 2. Chunks - individual pieces of content as they arrive
 * 3. Final messages - complete messages with parts array
 */

// ===== Vercel AI SDK UIMessage Validators =====
/**
 * Validators for Vercel AI SDK v5 UIMessage types
 * These are used when accepting UIMessages from the client
 */

// UIMessage text part validator
export const uiTextPartValidator = v.object({
	type: v.literal("text"),
	text: v.string(),
	state: v.optional(v.union(v.literal("streaming"), v.literal("done"))),
});

// UIMessage reasoning part validator
export const uiReasoningPartValidator = v.object({
	type: v.literal("reasoning"),
	text: v.string(),
	state: v.optional(v.union(v.literal("streaming"), v.literal("done"))),
	providerMetadata: v.optional(v.any()),
});

// UIMessage source URL part validator
export const uiSourceUrlPartValidator = v.object({
	type: v.literal("source-url"),
	sourceId: v.string(),
	url: v.string(),
	title: v.optional(v.string()),
	providerMetadata: v.optional(v.any()),
});

// UIMessage source document part validator
export const uiSourceDocumentPartValidator = v.object({
	type: v.literal("source-document"),
	sourceId: v.string(),
	mediaType: v.string(),
	title: v.string(),
	filename: v.optional(v.string()),
	providerMetadata: v.optional(v.any()),
});

// UIMessage file part validator
export const uiFilePartValidator = v.object({
	type: v.literal("file"),
	mediaType: v.string(),
	filename: v.optional(v.string()),
	url: v.string(),
});

// UIMessage step start part validator
export const uiStepStartPartValidator = v.object({
	type: v.literal("step-start"),
});

// UIMessage tool part validator - generic for any tool
export const uiToolPartValidator = v.object({
	type: v.string(), // Will be "tool-{toolName}"
	toolCallId: v.string(),
	state: v.union(
		v.literal("input-streaming"),
		v.literal("input-available"),
		v.literal("output-available"),
		v.literal("output-error"),
	),
	input: v.any(),
	output: v.optional(v.any()),
	errorText: v.optional(v.string()),
	providerExecuted: v.optional(v.boolean()),
});

// UIMessage data part validator - generic for any data type
export const uiDataPartValidator = v.object({
	type: v.string(), // Will be "data-{dataType}"
	id: v.optional(v.string()),
	data: v.any(),
});

// Union validator for all UI message parts
export const uiMessagePartValidator = v.union(
	uiTextPartValidator,
	uiReasoningPartValidator,
	uiSourceUrlPartValidator,
	uiSourceDocumentPartValidator,
	uiFilePartValidator,
	uiStepStartPartValidator,
	// For tool and data parts, we need a more flexible approach
	v.object({
		type: v.string(),
		// Allow any additional properties
		...Object.fromEntries(
			Array(20)
				.fill(null)
				.map((_, i) => [`field${i}`, v.optional(v.any())]),
		),
	}),
);

// UIMessage validator
export const uiMessageValidator = v.object({
	id: v.string(),
	role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
	parts: v.array(uiMessagePartValidator),
	metadata: v.optional(v.any()),
});

// Array of UIMessages validator
export const uiMessagesValidator = v.array(uiMessageValidator);

// SECTION 5: HTTP PROTOCOL VALIDATORS
// =========================================================================
/**
 * These validators define the HTTP API for streaming.
 * The protocol supports:
 * 1. Initiating streams with full context
 * 2. Resuming interrupted streams
 * 3. Real-time delivery of message parts
 * 4. Proper error handling and recovery
 */

// ===== Request Validators =====

/**
 * HTTP request to start a new stream
 */
export const httpStreamingRequestValidator = v.object({
	threadId: v.union(v.id("threads"), v.null()), // Can be null for new threads
	clientId: v.optional(clientIdValidator), // Optional clientId for optimistic threads
	modelId: modelIdValidator,
	messages: v.optional(uiMessagesValidator), // Optional UIMessages array for v2
	// Optional configuration
	options: v.optional(
		v.object({
			temperature: v.optional(v.number()),
			maxTokens: v.optional(v.number()),
			tools: v.optional(v.array(v.any())), // Tool definitions
			systemPrompt: v.optional(v.string()),

			// Streaming options
			streamingMode: v.optional(
				v.union(
					v.literal("balanced"), // Default - balance latency and efficiency
					v.literal("low-latency"), // Optimize for first token
					v.literal("efficient"), // Batch for efficiency
				),
			),

			// Use existing structures for the response
			useExistingMessage: v.optional(v.id("messages")),
			webSearchEnabled: v.optional(v.boolean()),

			// Trigger type for reconnection/regeneration
			trigger: v.optional(
				v.union(
					v.literal("submit-user-message"),
					v.literal("resume-stream"),
					v.literal("submit-tool-result"),
					v.literal("regenerate-assistant-message"),
				),
			),
		}),
	),
});

// ===== Response Validators =====

// Note: streamingMessageValidator has been removed in favor of the status-based system
// Client components now use the standard messageReturnValidator with status field

// =========================================================================
// SECTION 6: TYPE EXPORTS AND HELPERS
// =========================================================================
/**
 * The streaming architecture follows a clean separation of concerns:
 *
 * CONTENT LAYER (What):
 * - Message parts from Vercel AI SDK define the content
 * - Standard types: text, tool-call, reasoning, error, etc.
 * - Matches exactly what Vercel AI SDK produces
 *
 * INFRASTRUCTURE LAYER (How):
 * - Stream envelopes wrap content with metadata
 * - Provides ordering, deduplication, and resumption
 * - Handles lifecycle events (start, end, error)
 *
 * This design allows us to:
 * - Stream any Vercel AI SDK content without modification
 * - Add streaming-specific features transparently
 * - Support resumption and replay of partial streams
 */

// =========================================================================
// =========================================================================
/**
 * TypeScript types and helper functions for working with validators
 */

// ===== Core Types =====
export type MessagePart = Infer<typeof messagePartValidator>;
export type HTTPStreamingRequest = Infer<typeof httpStreamingRequestValidator>;

// ===== Message Part Types =====
export type TextPart = Infer<typeof textPartValidator>;
export type ToolCallPart = Infer<typeof toolCallPartValidator>;
export type ReasoningPart = Infer<typeof reasoningPartValidator>;
export type ErrorPart = Infer<typeof errorPartValidator>;

// ===== Type Guards =====

// Message part type guards
export function isTextPart(part: MessagePart): part is TextPart {
	return part.type === "text";
}

export function isToolCallPart(part: MessagePart): part is ToolCallPart {
	return part.type === "tool-call";
}

export function isReasoningPart(part: MessagePart): part is ReasoningPart {
	return part.type === "reasoning";
}

export function isErrorPart(part: MessagePart): part is ErrorPart {
	return part.type === "error";
}

// Tool call state guards
export function isToolCallInProgress(part: MessagePart): boolean {
	return isToolCallPart(part) && part.state === "partial-call";
}

export function isToolCallComplete(part: MessagePart): boolean {
	return isToolCallPart(part) && part.state === "call";
}

export function isToolCallWithResult(part: MessagePart): boolean {
	return isToolCallPart(part) && part.state === "result";
}

// ===== Validation Functions =====

// Title validation
export function validateTitle(title: string): boolean {
	return title.length >= 1 && title.length <= 80;
}

// ===== Utility Functions =====

/**
 * Extract text content from a message part
 */
export function getPartText(part: MessagePart): string | null {
	if (isTextPart(part)) return part.text;
	if (isReasoningPart(part)) return part.text;
	if (isErrorPart(part)) return part.errorMessage;
	return null;
}

/**
 * Check if a part contains streamable content
 */
export function isStreamablePart(part: MessagePart): boolean {
	return isTextPart(part) || isReasoningPart(part) || isToolCallPart(part);
}

/**
 * Convert stored chunk type to message part type
 */
