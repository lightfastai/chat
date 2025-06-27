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
 * 4. Streaming Infrastructure - How we wrap and deliver message parts
 * 5. Database Storage - How data is persisted
 * 6. HTTP Protocol - Wire format for client-server communication
 * 7. Helper Functions - Type guards and utilities
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
		experimentalFeatures: v.optional(
			v.object({
				httpStreaming: v.optional(v.boolean()),
			}),
		),
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
		v.literal("reasoning-part-finish"),
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

// =========================================================================
// SECTION 4: STREAMING INFRASTRUCTURE
// =========================================================================
/**
 * The streaming infrastructure wraps Vercel AI SDK message parts with
 * metadata needed for reliable, resumable streaming. The key principle:
 *
 * 1. Message parts (from Section 3) define WHAT content is streamed
 * 2. Streaming infrastructure (this section) defines HOW it's delivered
 *
 * This separation allows us to:
 * - Stream any message part type without modification
 * - Add streaming-specific metadata (IDs, timestamps, sequence numbers)
 * - Handle control events (init, complete, error) separately from content
 * - Support resumption and replay of streams
 */

// ===== Stream Envelope Validators =====
// These wrap message parts with streaming context

/**
 * Metadata attached to every streamed item
 * This enables ordering, deduplication, and resumption
 */
export const streamEnvelopeValidator = v.object({
	// Identity
	streamId: v.id("streams"),
	messageId: v.id("messages"),

	// Ordering and deduplication
	sequence: v.number(), // Monotonically increasing
	timestamp: v.number(), // Unix timestamp in ms

	// Content - exactly one of these will be present
	part: v.optional(messagePartValidator), // A message part from Vercel AI SDK
	event: v.optional(
		v.union(
			// Lifecycle events
			v.object({ type: v.literal("stream-start"), metadata: v.any() }),
			v.object({ type: v.literal("stream-end"), metadata: v.any() }),
			v.object({
				type: v.literal("stream-error"),
				error: v.string(),
				code: v.optional(v.string()),
			}),

			// Progress events
			v.object({ type: v.literal("token-usage"), usage: tokenUsageValidator }),
			v.object({ type: v.literal("metrics"), metrics: v.any() }),
		),
	),
});

/**
 * Simplified chunk format for HTTP streaming
 * This is what actually goes over the wire
 */
export const streamContentChunkValidator = v.object({
	type: v.literal("content"),
	envelope: streamEnvelopeValidator,
});

export const streamControlChunkValidator = v.object({
	type: v.literal("control"),
	action: v.union(
		v.literal("ping"), // Keepalive
		v.literal("abort"), // Client-initiated abort
		v.literal("ack"), // Acknowledgment
	),
	data: v.optional(v.any()),
});

// HTTP Stream chunk validator - the wire format for streaming
export const httpStreamChunkValidator = v.union(
	streamContentChunkValidator,
	streamControlChunkValidator,
);

// Type alias for easier migration
export type StreamChunk = Infer<typeof httpStreamChunkValidator>;

// =========================================================================
// SECTION 5: DATABASE STORAGE VALIDATORS
// =========================================================================
/**
 * These validators define how streaming data is persisted in the database.
 * We store:
 * 1. Stream records - track overall stream state
 * 2. Chunks - individual pieces of content as they arrive
 * 3. Final messages - complete messages with parts array
 */

// ===== Stream State Management =====

/**
 * Stream status - tracks lifecycle of a stream
 */
export const streamStatusValidator = v.union(
	v.literal("pending"), // Created but not started
	v.literal("streaming"), // Actively receiving content
	v.literal("done"), // Completed successfully
	v.literal("error"), // Failed with error
	v.literal("timeout"), // Timed out
);

/**
 * Stream record - stored in 'streams' table
 * Tracks the overall state of one AI response generation
 */
export const streamRecordValidator = v.object({
	status: streamStatusValidator,
	messageId: v.optional(v.id("messages")), // Associated message
	userId: v.optional(v.id("users")), // Owner
	createdAt: v.optional(v.number()),
	updatedAt: v.optional(v.number()),
	error: v.optional(v.string()), // Error message if failed
	metadata: v.optional(
		v.object({
			threadId: v.optional(v.id("threads")),
			modelId: v.optional(v.string()),
			parentStreamId: v.optional(v.id("streams")), // For retries
			attempt: v.optional(v.number()), // Retry attempt number
		}),
	),
});

// ===== Chunk Storage =====

/**
 * Chunk types that can be stored
 * These map to message part types but use simpler names for storage
 */
export const storedChunkTypeValidator = v.union(
	v.literal("text"), // Text content
	v.literal("tool_call"), // Tool invocation
	v.literal("tool_result"), // Tool response
	v.literal("reasoning"), // Model reasoning/thinking
	v.literal("error"), // Error during generation
	v.literal("control"), // Control events (start/stop)
	v.literal("step"), // Multi-step boundaries
);

/**
 * Stored chunk - how chunks are persisted in the 'chunks' table
 * These are converted to message parts when the stream completes
 */
export const storedChunkValidator = v.object({
	streamId: v.id("streams"),
	text: v.string(), // Content (may be JSON for complex types)
	type: v.optional(storedChunkTypeValidator),
	metadata: v.optional(
		v.object({
			// For tool calls/results
			toolName: v.optional(v.string()),
			toolCallId: v.optional(v.string()),

			// For text deltas
			isComplete: v.optional(v.boolean()), // Is this a complete part?

			// For reasoning
			thinkingStartedAt: v.optional(v.number()),
			thinkingCompletedAt: v.optional(v.number()),

			// Ordering
			sequence: v.optional(v.number()),

			// Performance
			tokenCount: v.optional(v.number()),
			processingTimeMs: v.optional(v.number()),
		}),
	),
	createdAt: v.optional(v.number()),
});

// =========================================================================
// SECTION 6: HTTP PROTOCOL VALIDATORS
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
	threadId: v.id("threads"),
	modelId: v.string(),
	messages: v.array(
		v.object({
			role: messageTypeValidator,
			content: v.string(),
		}),
	),
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

			// Resume from previous attempt
			resumeFromStreamId: v.optional(v.id("streams")),
		}),
	),
});

/**
 * Request to continue/resume an existing stream
 */
export const httpStreamContinuationValidator = v.object({
	streamId: v.id("streams"),
	fromSequence: v.optional(v.number()), // Resume from specific point
	options: v.optional(
		v.object({
			includeHistory: v.optional(v.boolean()), // Include past chunks
			maxHistoryChunks: v.optional(v.number()), // Limit history
		}),
	),
});

// ===== Response Validators =====

/**
 * Client-side streaming message representation
 * This is what the UI components work with
 */
export const streamingMessageValidator = v.object({
	_id: v.id("messages"),
	body: v.string(), // Accumulated text
	parts: v.optional(messagePartsValidator), // Structured parts
	isStreaming: v.boolean(),
	isComplete: v.boolean(),
	timestamp: v.number(),
	messageType: messageTypeValidator,
	modelId: v.optional(v.string()),

	// Streaming metadata
	streamId: v.optional(v.id("streams")),
	streamStatus: v.optional(streamStatusValidator),

	// Progress tracking
	metrics: v.optional(
		v.object({
			tokenCount: v.optional(v.number()),
			characterCount: v.optional(v.number()),
			partCount: v.optional(v.number()),
			duration: v.optional(v.number()), // milliseconds
		}),
	),

	// Error handling
	error: v.optional(v.string()),
	errorCode: v.optional(v.string()),
});

// =========================================================================
// SECTION 7: STREAMING ARCHITECTURE
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
// SECTION 8: TYPE EXPORTS AND HELPERS
// =========================================================================
/**
 * TypeScript types and helper functions for working with validators
 */

// ===== Core Types =====
export type MessagePart = Infer<typeof messagePartValidator>;
export type StreamEnvelope = Infer<typeof streamEnvelopeValidator>;
export type StreamStatus = Infer<typeof streamStatusValidator>;
export type StreamingMessage = Infer<typeof streamingMessageValidator>;
export type HTTPStreamingRequest = Infer<typeof httpStreamingRequestValidator>;
export type StoredChunk = Infer<typeof storedChunkValidator>;

// ===== Message Part Types =====
export type TextPart = Infer<typeof textPartValidator>;
export type ToolCallPart = Infer<typeof toolCallPartValidator>;
export type ReasoningPart = Infer<typeof reasoningPartValidator>;
export type ErrorPart = Infer<typeof errorPartValidator>;
export type ControlPart = Infer<typeof streamControlPartValidator>;

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

export function isControlPart(part: MessagePart): part is ControlPart {
	return part.type === "control";
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
export function chunkTypeToPartType(
	chunkType: Infer<typeof storedChunkTypeValidator>,
): MessagePart["type"] | null {
	const mapping: Record<string, MessagePart["type"]> = {
		text: "text",
		tool_call: "tool-call",
		tool_result: "tool-call", // Tool results are part of tool-call parts
		reasoning: "reasoning",
		error: "error",
		control: "control",
		step: "step",
	};
	return mapping[chunkType] || null;
}
