import { ALL_MODEL_IDS, ModelProviderSchema } from "@lightfast/ai/providers";
import { type LightfastToolName, TOOL_NAMES } from "@lightfast/ai/tools";
import { v } from "convex/values";

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
 *
 * Tool names now include version information (e.g., "web_search_1_0_0")
 * instead of separate toolName + toolVersion fields for simpler type safety.
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

// ===== Tool-Specific Validators =====
// Create toolNameValidator from TOOL_NAMES (now includes version in name)
export const toolNameValidator = v.union(
	...TOOL_NAMES.map((name) => v.literal(name)),
);

// Tool Input/Output Validators - Auto-generated from tool definitions
// Web Search v1.0.0 - Simple search with basic options
const webSearchV1InputValidator = v.object({
	query: v.string(),
	useAutoprompt: v.boolean(),
	numResults: v.number(),
});

const webSearchV1OutputValidator = v.object({
	results: v.array(
		v.object({
			title: v.string(),
			url: v.string(),
			snippet: v.optional(v.string()),
			score: v.optional(v.number()),
		}),
	),
	query: v.string(),
	autopromptString: v.optional(v.string()),
});

// Web Search v1.1.0 - Optimized search with content types and domain filtering
const webSearchV1_1InputValidator = v.object({
	query: v.string(),
	useAutoprompt: v.boolean(),
	numResults: v.number(),
	contentType: v.union(
		v.literal("highlights"),
		v.literal("summary"),
		v.literal("text"),
	),
	maxCharacters: v.number(),
	summaryQuery: v.optional(v.string()),
	includeDomains: v.optional(v.array(v.string())),
	excludeDomains: v.optional(v.array(v.string())),
});

const webSearchV1_1OutputValidator = v.object({
	results: v.array(
		v.object({
			title: v.string(),
			url: v.string(),
			content: v.string(),
			contentType: v.union(
				v.literal("highlights"),
				v.literal("summary"),
				v.literal("text"),
			),
			score: v.optional(v.number()),
		}),
	),
	query: v.string(),
	autopromptString: v.optional(v.string()),
	tokensEstimate: v.number(),
});

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

// Raw part validator - for debugging/development only
// Using v.any() is acceptable here as this is specifically for untyped raw data
export const rawPartValidator = v.object({
	type: v.literal("raw"),
	rawValue: v.any(), // Intentionally untyped for raw debugging data
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
	raw: v.optional(v.any()), // Original error object for debugging - any type is acceptable here
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

// Source URL part validator - matches Vercel AI SDK SourceUrlUIPart
export const sourceUrlPartValidator = v.object({
	type: v.literal("source-url"),
	sourceId: v.string(),
	url: v.string(),
	title: v.optional(v.string()),
	timestamp: v.number(),
});

// Source document part validator - matches Vercel AI SDK SourceDocumentUIPart
export const sourceDocumentPartValidator = v.object({
	type: v.literal("source-document"),
	sourceId: v.string(),
	mediaType: v.string(),
	title: v.string(),
	filename: v.optional(v.string()),
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

// ===== Tool Argument Validators =====
// Create discriminated union validators for each tool's arguments
// Tool arguments are now identified by the full versioned tool name

// ===== Mutation Argument Validators =====
// Discriminated union validators for tool-related mutations
// Now using versioned tool names instead of toolName + toolVersion

// Tool call mutation args - discriminated by versioned tool name
export const addToolCallArgsValidator = v.union(
	// Web search v1.0.0 - Simple search interface
	v.object({
		toolName: v.literal("web_search_1_0_0"),
		input: webSearchV1InputValidator,
	}),
	// Web search v1.1.0 - Optimized search with content types
	v.object({
		toolName: v.literal("web_search_1_1_0"),
		input: webSearchV1_1InputValidator,
	}),
	// Add more versioned tools here as they are defined
);

// Tool input start mutation args - discriminated by versioned tool name
export const addToolInputStartArgsValidator = v.union(
	// Web search v1.0.0
	v.object({
		toolName: v.literal("web_search_1_0_0"),
	}),
	// Web search v1.1.0
	v.object({
		toolName: v.literal("web_search_1_1_0"),
	}),
	// Add more versioned tools here as they are defined
);

// Tool result mutation args - discriminated by versioned tool name
export const addToolResultArgsValidator = v.union(
	// Web search v1.0.0 with v1 input/output schemas
	v.object({
		toolName: v.literal("web_search_1_0_0"),
		input: webSearchV1InputValidator,
		output: webSearchV1OutputValidator,
	}),
	// Web search v1.1.0 with v1.1 input/output schemas
	v.object({
		toolName: v.literal("web_search_1_1_0"),
		input: webSearchV1_1InputValidator,
		output: webSearchV1_1OutputValidator,
	}),
	// Add more versioned tools here as they are defined
);

// Tool call part validator - uses args field with discriminated union
export const toolCallPartValidator = v.object({
	type: v.literal("tool-call"),
	toolCallId: v.string(),
	timestamp: v.number(),
	args: addToolCallArgsValidator,
});

// Tool input start part validator - uses args field with discriminated union
export const toolInputStartPartValidator = v.object({
	type: v.literal("tool-input-start"),
	toolCallId: v.string(),
	timestamp: v.number(),
	args: addToolInputStartArgsValidator,
});

// Tool result part validator - uses args field with discriminated union
export const toolResultPartValidator = v.object({
	type: v.literal("tool-result"),
	toolCallId: v.string(),
	timestamp: v.number(),
	args: addToolResultArgsValidator,
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

// ===== Chunk Data Validators =====
// These validators define the data structure for buffered chunks (without messageId)

// Text chunk data
export const textChunkValidator = v.object({
	type: v.literal("text"),
	text: v.string(),
	timestamp: v.number(),
});

// Reasoning chunk data
export const reasoningChunkValidator = v.object({
	type: v.literal("reasoning"),
	text: v.string(),
	timestamp: v.number(),
});

// Raw chunk data
export const rawChunkValidator = v.object({
	type: v.literal("raw"),
	rawValue: v.any(),
	timestamp: v.number(),
});

// Error chunk data
export const errorChunkValidator = v.object({
	type: v.literal("error"),
	errorMessage: v.string(),
	errorDetails: v.optional(errorDetailsValidator),
	timestamp: v.number(),
});

// Tool input start chunk data
export const toolInputStartChunkValidator = v.object({
	type: v.literal("tool-input-start"),
	toolCallId: v.string(),
	timestamp: v.number(),
	args: addToolInputStartArgsValidator,
});

// Tool call chunk data
export const toolCallChunkValidator = v.object({
	type: v.literal("tool-call"),
	toolCallId: v.string(),
	timestamp: v.number(),
	args: addToolCallArgsValidator,
});

// Tool result chunk data
export const toolResultChunkValidator = v.object({
	type: v.literal("tool-result"),
	toolCallId: v.string(),
	timestamp: v.number(),
	args: addToolResultArgsValidator,
});

// Source URL chunk data
export const sourceUrlChunkValidator = v.object({
	type: v.literal("source-url"),
	sourceId: v.string(),
	url: v.string(),
	title: v.optional(v.string()),
	timestamp: v.number(),
});

// Source document chunk data
export const sourceDocumentChunkValidator = v.object({
	type: v.literal("source-document"),
	sourceId: v.string(),
	mediaType: v.string(),
	title: v.string(),
	filename: v.optional(v.string()),
	timestamp: v.number(),
});

// File chunk data
export const fileChunkValidator = v.object({
	type: v.literal("file"),
	mediaType: v.string(),
	filename: v.optional(v.string()),
	url: v.string(),
	timestamp: v.number(),
});

// Union of all chunk types for buffering
export const bufferedChunkValidator = v.union(
	textChunkValidator,
	reasoningChunkValidator,
	rawChunkValidator,
	errorChunkValidator,
	toolInputStartChunkValidator,
	toolCallChunkValidator,
	toolResultChunkValidator,
	sourceUrlChunkValidator,
	sourceDocumentChunkValidator,
	fileChunkValidator,
);

// ===== Mutation Argument Validators =====
// These validators define the arguments for message part mutations

// Add text part mutation args
export const addTextPartArgsValidator = v.object({
	messageId: v.id("messages"),
	text: v.string(),
	timestamp: v.number(),
});

// Add reasoning part mutation args
export const addReasoningPartArgsValidator = v.object({
	messageId: v.id("messages"),
	text: v.string(),
	timestamp: v.number(),
});

// Add raw part mutation args
export const addRawPartArgsValidator = v.object({
	messageId: v.id("messages"),
	rawValue: v.any(),
	timestamp: v.number(),
});

// Add error part mutation args
export const addErrorPartArgsValidator = v.object({
	messageId: v.id("messages"),
	errorMessage: v.string(),
	errorDetails: v.optional(errorDetailsValidator),
});

// Add tool input start part mutation args
export const addToolInputStartPartArgsValidator = v.object({
	messageId: v.id("messages"),
	toolCallId: v.string(),
	timestamp: v.number(),
	args: addToolInputStartArgsValidator,
});

// Add tool call part mutation args
export const addToolCallPartArgsValidator = v.object({
	messageId: v.id("messages"),
	toolCallId: v.string(),
	timestamp: v.number(),
	args: addToolCallArgsValidator,
});

// Add tool result part mutation args
export const addToolResultPartArgsValidator = v.object({
	messageId: v.id("messages"),
	toolCallId: v.string(),
	timestamp: v.number(),
	args: addToolResultArgsValidator,
});

// Add source URL part mutation args
export const addSourceUrlPartArgsValidator = v.object({
	messageId: v.id("messages"),
	sourceId: v.string(),
	url: v.string(),
	title: v.optional(v.string()),
	timestamp: v.number(),
});

// Add source document part mutation args
export const addSourceDocumentPartArgsValidator = v.object({
	messageId: v.id("messages"),
	sourceId: v.string(),
	mediaType: v.string(),
	title: v.string(),
	filename: v.optional(v.string()),
	timestamp: v.number(),
});

// Add file part mutation args
export const addFilePartArgsValidator = v.object({
	messageId: v.id("messages"),
	mediaType: v.string(),
	filename: v.optional(v.string()),
	url: v.string(),
	timestamp: v.number(),
});

// ===== Deprecated Field Validators =====
// These validators contain deprecated fields that are being phased out
// DO NOT use these fields in new code - they exist only for schema migration

// Deprecated chunk ID validator (format: chunk_<timestamp>_<random>)
const chunkIdValidator = v.string();

// Deprecated stream chunk validator
const streamChunkValidator = v.object({
	// Support both old "id" field and new "chunkId" field for backward compatibility
	chunkId: v.optional(chunkIdValidator),
	id: v.optional(chunkIdValidator), // Legacy field from before PR #195
	content: v.string(),
	timestamp: v.number(),
	sequence: v.optional(v.number()), // Legacy field from before PR #195
	isThinking: v.optional(v.boolean()),
});

// Thread deprecated fields validator
export const threadDeprecatedValidator = v.object({
	// @deprecated: use _creationTime instead
	createdAt: v.optional(v.number()),
	// @deprecated: Still used by backend/UI but will be migrated
	isTitleGenerating: v.optional(v.boolean()),
	// @deprecated: threads are sorted by _creationTime only
	lastMessageAt: v.optional(v.number()),
	// @deprecated: generation status tracked in messages
	isGenerating: v.optional(v.boolean()),
	// @deprecated: usage tracking moved to message level
	usage: v.optional(
		v.object({
			inputTokens: v.optional(v.number()),
			outputTokens: v.optional(v.number()),
			totalTokens: v.optional(v.number()),
		}),
	),
});

// Messages deprecated fields validator
export const messagesDeprecatedValidator = v.object({
	// @deprecated: use role instead
	messageType: v.optional(roleValidator),
	// @deprecated: use metadata.model instead
	modelId: v.optional(modelIdValidator),
	// @deprecated: use metadata.usedUserApiKey instead
	usedUserApiKey: v.optional(v.boolean()),
	// @deprecated: use metadata.thinkingStartedAt instead
	thinkingStartedAt: v.optional(v.number()),
	// @deprecated: use metadata.thinkingCompletedAt instead
	thinkingCompletedAt: v.optional(v.number()),
	// @deprecated: use metadata.model instead
	model: v.optional(modelProviderValidator),
	// @deprecated: use _creationTime instead
	timestamp: v.optional(v.number()),
	// @deprecated: use parts array instead
	body: v.optional(v.string()),
	// @deprecated: use status instead
	isStreaming: v.optional(v.boolean()),
	// @deprecated: streaming handled differently in V2
	streamId: v.optional(v.string()),
	// @deprecated: use status instead
	isComplete: v.optional(v.boolean()),
	// @deprecated: not used in V2
	streamVersion: v.optional(v.number()),
	// @deprecated: use parts array instead
	thinkingContent: v.optional(v.string()),
	// @deprecated: use status instead
	isThinking: v.optional(v.boolean()),
	// @deprecated: use parts array instead
	hasThinkingContent: v.optional(v.boolean()),
	// @deprecated: use metadata.usage instead
	usage: v.optional(
		v.object({
			inputTokens: v.optional(v.number()),
			outputTokens: v.optional(v.number()),
			totalTokens: v.optional(v.number()),
		}),
	),
	// @deprecated: streaming chunks replaced by parts array
	streamChunks: v.optional(v.array(streamChunkValidator)),
	// @deprecated: chunk tracking not used in V2
	lastChunkId: v.optional(chunkIdValidator),
});

// ===== Validation Functions =====
// Title validation

export function validateTitle(title: string): boolean {
	return title.length >= 1 && title.length <= 80;
}

// Tool name validation using the new versioned tool names
export function isValidToolName(
	toolName: string,
): toolName is LightfastToolName {
	return TOOL_NAMES.includes(toolName as LightfastToolName);
}
