/**
 * Messages API
 *
 * All message-related Convex functions (queries, mutations, actions) are defined here.
 * The messages/ directory contains pure utility functions that are used by these functions.
 * This architecture eliminates circular dependencies by keeping database operations
 * separate from utility functions.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import {
	type CoreMessage,
	stepCountIs,
	streamText,
	type TextStreamPart,
	type ToolSet,
} from "ai";
import { v } from "convex/values";
import {
  type ModelId,
  getModelById,
  getProviderFromModelId,
} from "../src/lib/ai/schemas.js";
import { internal } from "./_generated/api.js";
import type { Doc, Id } from "./_generated/dataModel.js";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js";
import { createAIClient } from "./lib/ai_client.js";
import { createWebSearchTool } from "./lib/ai_tools.js";
import { getAuthenticatedUserId } from "./lib/auth.js";
import { getOrThrow, getWithOwnership } from "./lib/database.js";
import { requireResource, throwConflictError } from "./lib/errors.js";
import { createSystemPrompt } from "./lib/message_builder.js";
import {
  branchInfoValidator,
  clientIdValidator,
  messageTypeValidator,
  modelIdValidator,
  modelProviderValidator,
  shareIdValidator,
  shareSettingsValidator,
  streamIdValidator,
  threadUsageValidator,
  tokenUsageValidator,
} from "./validators.js";

// Import utility functions from messages/ directory
import {
  clearGenerationFlagUtil,
  createStreamingMessageUtil,
  generateStreamId,
  handleAIResponseError,
  streamAIResponse,
  updateThreadUsage,
  updateThreadUsageUtil,
} from "./messages/helpers.js";
import {
  type AISDKUsage,
  type MessageUsageUpdate,
  formatUsageData,
  messageReturnValidator,
} from "./messages/types.js";

// Type definitions for multimodal content
type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image"; image: string | URL };
type FilePart = {
	type: "file";
	data: string | URL;
	mediaType: string;
};

export type MultimodalContent = string | Array<TextPart | ImagePart | FilePart>;

// Export types
export type {
	MessageUsageUpdate,
	AISDKUsage,
} from "./messages/types.js";

// ===== QUERIES =====

export const listByClientId = query({
	args: {
		clientId: clientIdValidator,
	},
	returns: v.array(messageReturnValidator),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return [];
		}

		// First get the thread by clientId
		const thread = await ctx.db
			.query("threads")
			.withIndex("by_user_client", (q) =>
				q.eq("userId", userId).eq("clientId", args.clientId),
			)
			.first();

		if (!thread) {
			return [];
		}

		// Then get messages for this thread
		return await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", thread._id))
			.order("desc")
			.take(50);
	},
});

export const list = query({
	args: {
		threadId: v.id("threads"),
	},
	returns: v.array(messageReturnValidator),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return [];
		}

		// Verify the user owns this thread
		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== userId) {
			return [];
		}

		return await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.order("desc")
			.take(50);
	},
});

export const getThreadUsage = query({
	args: {
		threadId: v.id("threads"),
	},
	returns: v.object({
		totalInputTokens: v.number(),
		totalOutputTokens: v.number(),
		totalTokens: v.number(),
		totalReasoningTokens: v.number(),
		totalCachedInputTokens: v.number(),
		messageCount: v.number(),
		modelStats: v.array(
			v.object({
				model: v.string(),
				inputTokens: v.number(),
				outputTokens: v.number(),
				totalTokens: v.number(),
				reasoningTokens: v.optional(v.number()),
				cachedInputTokens: v.optional(v.number()),
				messageCount: v.number(),
			}),
		),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return {
				totalInputTokens: 0,
				totalOutputTokens: 0,
				totalTokens: 0,
				totalReasoningTokens: 0,
				totalCachedInputTokens: 0,
				messageCount: 0,
				modelStats: [],
			};
		}

		// Verify the user owns this thread
		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== userId) {
			return {
				totalInputTokens: 0,
				totalOutputTokens: 0,
				totalTokens: 0,
				totalReasoningTokens: 0,
				totalCachedInputTokens: 0,
				messageCount: 0,
				modelStats: [],
			};
		}

		// Return usage from thread table (fast O(1) lookup!)
		const usage = thread.usage;
		if (!usage) {
			return {
				totalInputTokens: 0,
				totalOutputTokens: 0,
				totalTokens: 0,
				totalReasoningTokens: 0,
				totalCachedInputTokens: 0,
				messageCount: 0,
				modelStats: [],
			};
		}

		// Convert modelStats record to array format
		const modelStats = Object.entries(usage.modelStats || {}).map(
			([model, stats]) => ({
				model,
				inputTokens: stats.inputTokens,
				outputTokens: stats.outputTokens,
				totalTokens: stats.totalTokens,
				reasoningTokens: stats.reasoningTokens || 0,
				cachedInputTokens: stats.cachedInputTokens || 0,
				messageCount: stats.messageCount,
			}),
		);

		return {
			totalInputTokens: usage.totalInputTokens,
			totalOutputTokens: usage.totalOutputTokens,
			totalTokens: usage.totalTokens,
			totalReasoningTokens: usage.totalReasoningTokens,
			totalCachedInputTokens: usage.totalCachedInputTokens,
			messageCount: usage.messageCount,
			modelStats,
		};
	},
});

// Internal function to get recent conversation context
export const getRecentContext = internalQuery({
	args: {
		threadId: v.id("threads"),
	},
	returns: v.array(
		v.object({
			body: v.string(),
			messageType: messageTypeValidator,
			attachments: v.optional(v.array(v.id("files"))),
		}),
	),
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.order("desc")
			.take(10);

		return messages
			.reverse() // Get chronological order
			.filter((msg: Doc<"messages">) => msg.isComplete !== false) // Only include complete messages
			.map((msg: Doc<"messages">) => ({
				body: msg.body,
				messageType: msg.messageType,
				attachments: msg.attachments,
			}));
	},
});

// Internal query to get thread by ID
export const getThreadById = internalQuery({
	args: {
		threadId: v.id("threads"),
	},
	returns: v.union(
		v.object({
			_id: v.id("threads"),
			_creationTime: v.number(),
			userId: v.id("users"),
			clientId: v.optional(clientIdValidator),
			title: v.string(),
			createdAt: v.number(),
			lastMessageAt: v.number(),
			isGenerating: v.optional(v.boolean()),
			isTitleGenerating: v.optional(v.boolean()),
			pinned: v.optional(v.boolean()),
			// Branch information
			branchedFrom: branchInfoValidator,
			// Share functionality
			isPublic: v.optional(v.boolean()),
			shareId: v.optional(shareIdValidator),
			sharedAt: v.optional(v.number()),
			shareSettings: shareSettingsValidator,
			usage: threadUsageValidator,
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		return await ctx.db.get(args.threadId);
	},
});

// ===== MUTATIONS =====

// Internal mutation to build message content with attachments
export const buildMessageContent = internalMutation({
	args: {
		text: v.string(),
		attachmentIds: v.optional(v.array(v.id("files"))),
		provider: v.optional(
			v.union(
				v.literal("openai"),
				v.literal("anthropic"),
				v.literal("openrouter"),
			),
		),
		modelId: v.optional(modelIdValidator),
	},
	returns: v.union(
		v.string(),
		v.array(
			v.union(
				v.object({ type: v.literal("text"), text: v.string() }),
				v.object({
					type: v.literal("image"),
					image: v.union(v.string(), v.any()),
				}),
				v.object({
					type: v.literal("file"),
					data: v.union(v.string(), v.any()),
					mediaType: v.string(),
				}),
			),
		),
	),
	handler: async (ctx, args) => {
		// If no attachments, return simple text content
		if (!args.attachmentIds || args.attachmentIds.length === 0) {
			return args.text;
		}

		// Get model configuration to check capabilities
		const modelConfig = args.modelId ? getModelById(args.modelId) : null;
		const hasVisionSupport = modelConfig?.features.vision ?? false;
		const hasPdfSupport = modelConfig?.features.pdfSupport ?? false;

		// Build content array with text and files
		const content = [{ type: "text" as const, text: args.text }] as Array<
			TextPart | ImagePart | FilePart
		>;

		// Fetch each file with its URL
		for (const fileId of args.attachmentIds) {
			const file = await ctx.runQuery(internal.files.getFileWithUrl, {
				fileId,
			});
			if (!file || !file.url) continue;

			// Handle images
			if (file.fileType.startsWith("image/")) {
				if (!hasVisionSupport) {
					// Model doesn't support vision
					if (content[0] && "text" in content[0]) {
						content[0].text += `\n\n[Attached image: ${file.fileName}]\n⚠️ Note: ${modelConfig?.displayName || "This model"} cannot view images. Please switch to GPT-4o, GPT-4o Mini, or any Claude model to analyze this image.`;
					}
				} else {
					// Model supports vision - all models use URLs (no base64 needed)
					content.push({
						type: "image" as const,
						image: file.url,
					});
				}
			}
			// Handle PDFs
			else if (file.fileType === "application/pdf") {
				if (hasPdfSupport && args.provider === "anthropic") {
					// Claude supports PDFs as file type
					content.push({
						type: "file" as const,
						data: file.url,
						mediaType: "application/pdf",
					});
				} else {
					// PDF not supported - add as text description
					const description = `\n[Attached PDF: ${file.fileName} (${(file.fileSize / 1024).toFixed(1)}KB)] - Note: PDF content analysis requires Claude models.`;
					content.push({
						type: "text" as const,
						text: description,
					});
				}
			}
			// For other file types, add as text description
			else {
				const description = `\n[Attached file: ${file.fileName} (${file.fileType}, ${(file.fileSize / 1024).toFixed(1)}KB)]`;

				if (content[0] && "text" in content[0]) {
					content[0].text += description;
				}
			}
		}

		return content;
	},
});

export const send = mutation({
	args: {
		threadId: v.id("threads"),
		body: v.string(),
		modelId: v.optional(modelIdValidator), // Use the validated modelId
		attachments: v.optional(v.array(v.id("files"))), // Add attachments support
		webSearchEnabled: v.optional(v.boolean()),
	},
	returns: v.object({
		messageId: v.id("messages"),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthenticatedUserId(ctx);

		// Verify the user owns this thread and check generation status
		const thread = await getWithOwnership(
			ctx.db,
			"threads",
			args.threadId,
			userId,
		);

		// Prevent new messages while AI is generating
		if (thread.isGenerating) {
			throwConflictError(
				"Please wait for the current AI response to complete before sending another message",
			);
		}

		// CRITICAL FIX: Set generation flag IMMEDIATELY to prevent race conditions
		await ctx.db.patch(args.threadId, {
			isGenerating: true,
			lastMessageAt: Date.now(),
		});

		// Use default model if none provided
		const modelId = args.modelId || "gpt-4o-mini";

		// Derive provider from modelId (type-safe)
		const provider = getProviderFromModelId(modelId as ModelId);

		// Insert user message after setting generation flag
		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			body: args.body,
			timestamp: Date.now(),
			messageType: "user",
			model: provider,
			modelId: modelId,
			attachments: args.attachments,
		});

		// Schedule AI response using the modelId
		await ctx.scheduler.runAfter(0, internal.messages.generateAIResponse, {
			threadId: args.threadId,
			userMessage: args.body,
			modelId: modelId,
			attachments: args.attachments,
			webSearchEnabled: args.webSearchEnabled,
		});

		// Check if this is the first user message in the thread (for title generation)
		const userMessages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.filter((q) => q.eq(q.field("messageType"), "user"))
			.collect();

		// If this is the first user message, schedule title generation
		if (userMessages.length === 1) {
			await ctx.scheduler.runAfter(100, internal.titles.generateTitle, {
				threadId: args.threadId,
				userMessage: args.body,
			});
		}

		return { messageId };
	},
});

// Combined mutation for creating thread + sending first message (optimistic flow)
export const createThreadAndSend = mutation({
	args: {
		title: v.string(),
		clientId: v.string(),
		body: v.string(),
		modelId: v.optional(modelIdValidator),
		attachments: v.optional(v.array(v.id("files"))), // Add attachments support
		webSearchEnabled: v.optional(v.boolean()),
	},
	returns: v.object({
		threadId: v.id("threads"),
		userMessageId: v.id("messages"),
		assistantMessageId: v.id("messages"),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthenticatedUserId(ctx);

		// Check for collision if clientId is provided (extremely rare with nanoid)
		const existing = await ctx.db
			.query("threads")
			.withIndex("by_client_id", (q) => q.eq("clientId", args.clientId))
			.first();

		if (existing) {
			throwConflictError(
				`Thread with clientId ${args.clientId} already exists`,
			);
		}

		// Use default model if none provided
		const modelId = args.modelId || "gpt-4o-mini";
		const provider = getProviderFromModelId(modelId as ModelId);

		// Create thread atomically with generation flag set
		const now = Date.now();
		const threadId = await ctx.db.insert("threads", {
			clientId: args.clientId,
			title: args.title,
			userId: userId,
			createdAt: now,
			lastMessageAt: now,
			isTitleGenerating: true,
			isGenerating: true, // Set immediately to prevent race conditions
			// Initialize usage field so header displays even with 0 tokens
			usage: {
				totalInputTokens: 0,
				totalOutputTokens: 0,
				totalTokens: 0,
				totalReasoningTokens: 0,
				totalCachedInputTokens: 0,
				messageCount: 0,
				modelStats: {},
			},
		});

		// Insert user message
		const userMessageId = await ctx.db.insert("messages", {
			threadId,
			body: args.body,
			timestamp: now,
			messageType: "user",
			model: provider,
			modelId: modelId,
			attachments: args.attachments,
		});

		// Generate unique stream ID for assistant message
		const streamId = generateStreamId();

		// Create assistant message placeholder immediately
		const assistantMessageId = await ctx.db.insert("messages", {
			threadId,
			body: "", // Will be updated as chunks arrive
			timestamp: now + 1, // Ensure it comes after user message
			messageType: "assistant",
			model: provider,
			modelId: modelId,
			isStreaming: true,
			streamId: streamId,
			isComplete: false,
			thinkingStartedAt: now,
			streamVersion: 0, // Initialize version counter
			parts: [], // Initialize empty parts array for tool calls
			usage: undefined, // Initialize usage tracking
		});

		// Schedule AI response with the pre-created message ID
		await ctx.scheduler.runAfter(
			0,
			internal.messages.generateAIResponseWithMessage,
			{
				threadId,
				userMessage: args.body,
				modelId: modelId,
				attachments: args.attachments,
				webSearchEnabled: args.webSearchEnabled,
				messageId: assistantMessageId,
				streamId: streamId,
			},
		);

		// Schedule title generation (this is the first message)
		await ctx.scheduler.runAfter(100, internal.titles.generateTitle, {
			threadId,
			userMessage: args.body,
		});

		return {
			threadId,
			userMessageId,
			assistantMessageId,
		};
	},
});

// Internal mutation to create initial streaming message
export const createStreamingMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		streamId: streamIdValidator,
		provider: modelProviderValidator,
		modelId: modelIdValidator,
		usedUserApiKey: v.optional(v.boolean()),
	},
	returns: v.id("messages"),
	handler: async (ctx, args) => {
		const now = Date.now();
		return await ctx.db.insert("messages", {
			threadId: args.threadId,
			body: "", // Will be updated as chunks arrive
			timestamp: now,
			messageType: "assistant",
			model: args.provider,
			isStreaming: true,
			streamId: args.streamId,
			isComplete: false,
			thinkingStartedAt: now,
			streamVersion: 0, // Initialize version counter
			modelId: args.modelId,
			usedUserApiKey: args.usedUserApiKey,
			parts: [], // Initialize empty parts array for tool calls
			usage: undefined, // Initialize usage tracking
		});
	},
});

// Internal mutation to update streaming message content
export const updateStreamingMessage = internalMutation({
	args: {
		messageId: v.id("messages"),
		content: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		// For backward compatibility, we'll update the body directly
		// but in the new streaming logic, use appendStreamChunk instead
		await ctx.db.patch(args.messageId, {
			body: args.content,
			streamVersion:
				((await ctx.db.get(args.messageId))?.streamVersion || 0) + 1,
		});

		return null;
	},
});

// Internal mutation to update message API key status
export const updateMessageApiKeyStatus = internalMutation({
	args: {
		messageId: v.id("messages"),
		usedUserApiKey: v.boolean(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			usedUserApiKey: args.usedUserApiKey,
		});
		return null;
	},
});

// Internal mutation to update thread usage
export const updateThreadUsageMutation = internalMutation({
	args: {
		threadId: v.id("threads"),
		usage: v.object({
			promptTokens: v.number(),
			completionTokens: v.number(),
			totalTokens: v.number(),
			reasoningTokens: v.number(),
			cachedTokens: v.number(),
			modelId: modelIdValidator,
		}),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { threadId, usage } = args;
		const messageUsage: MessageUsageUpdate = {
			inputTokens: usage.promptTokens,
			outputTokens: usage.completionTokens,
			totalTokens: usage.totalTokens,
			reasoningTokens: usage.reasoningTokens,
			cachedInputTokens: usage.cachedTokens,
		};

		await updateThreadUsage(ctx, threadId, usage.modelId, messageUsage);
		return null;
	},
});

// Internal mutation to update message with error
export const updateMessageError = internalMutation({
	args: {
		messageId: v.id("messages"),
		errorMessage: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			body: args.errorMessage,
			isStreaming: false,
			isComplete: true,
			thinkingCompletedAt: Date.now(),
		});
		return null;
	},
});

// Internal mutation to mark streaming as complete (original version)
export const completeStreamingMessageLegacy = internalMutation({
	args: {
		messageId: v.id("messages"),
		usage: tokenUsageValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		// Verify the message exists
		await getOrThrow(ctx.db, "messages", args.messageId);

		// Update the message with completion status and usage
		await ctx.db.patch(args.messageId, {
			isStreaming: false,
			isComplete: true,
			thinkingCompletedAt: Date.now(),
			usage: args.usage,
		});

		// Thread usage has already been updated via updateUsage during streaming
		// No need to update again here to avoid double counting

		return null;
	},
});

// Internal mutation to mark streaming as complete and update thread usage
export const completeStreamingMessage = internalMutation({
	args: {
		messageId: v.id("messages"),
		streamId: streamIdValidator,
		fullText: v.string(),
		usage: tokenUsageValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		// Verify the message exists
		await getOrThrow(ctx.db, "messages", args.messageId);

		// Update the message with completion status and full text
		await ctx.db.patch(args.messageId, {
			body: args.fullText,
			isStreaming: false,
			isComplete: true,
			thinkingCompletedAt: Date.now(),
			usage: args.usage,
		});

		// Thread usage has already been updated via updateUsage during streaming
		// No need to update again here to avoid double counting

		return null;
	},
});

// Internal mutation to create error message
export const createErrorMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		streamId: streamIdValidator,
		provider: modelProviderValidator,
		modelId: v.optional(modelIdValidator),
		errorMessage: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const now = Date.now();
		await ctx.db.insert("messages", {
			threadId: args.threadId,
			body: args.errorMessage,
			timestamp: now,
			messageType: "assistant",
			model: args.provider,
			modelId: args.modelId,
			isStreaming: false,
			streamId: args.streamId,
			isComplete: true,
			thinkingStartedAt: now,
			thinkingCompletedAt: now,
			parts: [], // Initialize empty parts array for tool calls
			usage: undefined, // Initialize usage tracking
		});

		return null;
	},
});

// Internal mutation to update thinking state
export const updateThinkingState = internalMutation({
	args: {
		messageId: v.id("messages"),
		isThinking: v.boolean(),
		hasThinkingContent: v.boolean(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			isThinking: args.isThinking,
			hasThinkingContent: args.hasThinkingContent,
		});
		return null;
	},
});

// Internal mutation to update thinking content
export const updateThinkingContent = internalMutation({
	args: {
		messageId: v.id("messages"),
		thinkingContent: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			thinkingContent: args.thinkingContent,
		});
		return null;
	},
});

// Internal mutation to clear the generation flag
export const clearGenerationFlag = internalMutation({
	args: {
		threadId: v.id("threads"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.threadId, {
			isGenerating: false,
		});
	},
});

// ===== Message Parts Mutations (Vercel AI SDK v5) =====

// Internal mutation to add a text part to a message
export const addTextPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		text: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "text" as const,
				text: args.text,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a reasoning part to a message
export const addReasoningPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		text: v.string(),
		providerMetadata: v.optional(v.any()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "reasoning" as const,
				text: args.text,
				providerMetadata: args.providerMetadata,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a file part to a message
export const addFilePart = internalMutation({
	args: {
		messageId: v.id("messages"),
		url: v.optional(v.string()),
		mediaType: v.string(),
		data: v.optional(v.any()),
		filename: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "file" as const,
				url: args.url,
				mediaType: args.mediaType,
				data: args.data,
				filename: args.filename,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a source part to a message
export const addSourcePart = internalMutation({
	args: {
		messageId: v.id("messages"),
		sourceType: v.union(v.literal("url"), v.literal("document")),
		sourceId: v.string(),
		url: v.optional(v.string()),
		title: v.optional(v.string()),
		mediaType: v.optional(v.string()),
		filename: v.optional(v.string()),
		providerMetadata: v.optional(v.any()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "source" as const,
				sourceType: args.sourceType,
				sourceId: args.sourceId,
				url: args.url,
				title: args.title,
				mediaType: args.mediaType,
				filename: args.filename,
				providerMetadata: args.providerMetadata,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add an error part to a message
export const addErrorPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		errorMessage: v.string(),
		errorDetails: v.optional(v.any()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "error" as const,
				errorMessage: args.errorMessage,
				errorDetails: args.errorDetails,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a raw part to a message
export const addRawPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		rawValue: v.any(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "raw" as const,
				rawValue: args.rawValue,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add step metadata part
export const addStepPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		stepType: v.union(v.literal("start-step"), v.literal("finish-step")),
		metadata: v.optional(v.any()),
		usage: v.optional(v.any()),
		finishReason: v.optional(v.string()),
		warnings: v.optional(v.array(v.any())),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "step" as const,
				stepType: args.stepType,
				...(args.metadata && { metadata: args.metadata }),
				...(args.usage && { usage: args.usage }),
				...(args.finishReason && { finishReason: args.finishReason }),
				...(args.warnings && { warnings: args.warnings }),
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add stream control parts (start, finish, etc.)
export const addStreamControlPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		controlType: v.union(
			v.literal("start"),
			v.literal("finish"),
			v.literal("reasoning-part-finish")
		),
		finishReason: v.optional(v.string()),
		totalUsage: v.optional(v.any()),
		metadata: v.optional(v.any()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "control" as const,
				controlType: args.controlType,
				...(args.finishReason && { finishReason: args.finishReason }),
				...(args.totalUsage && { totalUsage: args.totalUsage }),
				...(args.metadata && { metadata: args.metadata }),
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a tool call part to a message
export const addToolCallPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		toolCallId: v.string(),
		toolName: v.string(),
		args: v.optional(v.any()),
		state: v.optional(
			v.union(
				v.literal("partial-call"),
				v.literal("call"),
				v.literal("result"),
			),
		),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "tool-call" as const,
				toolCallId: args.toolCallId,
				toolName: args.toolName,
				args: args.args,
				state: args.state || "call",
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to update a tool call part in a message
export const updateToolCallPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		toolCallId: v.string(),
		args: v.optional(v.any()),
		result: v.optional(v.any()),
		state: v.optional(
			v.union(
				v.literal("partial-call"),
				v.literal("call"),
				v.literal("result"),
			),
		),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];

		// Find the tool call part and update its args, result, and/or state
		const updatedParts = currentParts.map((part) => {
			if (part.type === "tool-call" && part.toolCallId === args.toolCallId) {
				return {
					...part,
					...(args.args !== undefined && { args: args.args }),
					...(args.result !== undefined && { result: args.result }),
					...(args.state !== undefined && { state: args.state }),
				};
			}
			return part;
		});

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// ===== ACTIONS =====

// Helper function to build conversation messages using utility functions
async function buildConversationMessages(
	ctx: ActionCtx,
	threadId: Id<"threads">,
	modelId: ModelId,
	attachments?: Id<"files">[],
	webSearchEnabled?: boolean,
): Promise<CoreMessage[]> {
	// Get recent conversation context
	const recentMessages: Array<{
		body: string;
		messageType: "user" | "assistant" | "system";
		attachments?: Id<"files">[];
	}> = await ctx.runQuery(internal.messages.getRecentContext, { threadId });

	const provider = getProviderFromModelId(modelId);
	const systemPrompt = createSystemPrompt(modelId, webSearchEnabled);

	// Prepare messages for AI SDK v5 with multimodal support
	const messages: CoreMessage[] = [
		{
			role: "system",
			content: systemPrompt,
		},
	];

	// Build conversation history with attachments
	for (let i = 0; i < recentMessages.length; i++) {
		const msg = recentMessages[i];
		const isLastUserMessage =
			i === recentMessages.length - 1 && msg.messageType === "user";

		// For the last user message, include the current attachments
		const attachmentsToUse =
			isLastUserMessage && attachments ? attachments : msg.attachments;

		// Build message content with attachments using mutation
		const content = await ctx.runMutation(
			internal.messages.buildMessageContent,
			{
				text: msg.body,
				attachmentIds: attachmentsToUse,
				provider,
				modelId,
			},
		);

		messages.push({
			role: msg.messageType === "user" ? "user" : "assistant",
			content,
		} as CoreMessage);
	}

	return messages;
}

// New action that uses pre-created message ID
export const generateAIResponseWithMessage = internalAction({
	args: {
		threadId: v.id("threads"),
		userMessage: v.string(),
		modelId: modelIdValidator,
		attachments: v.optional(v.array(v.id("files"))),
		webSearchEnabled: v.optional(v.boolean()),
		messageId: v.id("messages"), // Pre-created message ID
		streamId: streamIdValidator, // Pre-generated stream ID
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		try {
			// Since this is called from createThreadAndSend, we know the thread exists
			// We just need to get the userId for API key retrieval
			const thread = (await ctx.runQuery(internal.messages.getThreadById, {
				threadId: args.threadId,
			})) as { userId: Id<"users"> } | null;
			requireResource(thread, "Thread");

			// Derive provider from modelId
			const provider = getProviderFromModelId(args.modelId as ModelId);

			// Get user's API keys if available
			const userApiKeys = (await ctx.runMutation(
				internal.userSettings.getDecryptedApiKeys,
				{ userId: thread.userId },
			)) as {
				anthropic?: string;
				openai?: string;
				openrouter?: string;
			} | null;

			// Determine if we'll use user's API key
			const willUseUserApiKey =
				(provider === "anthropic" && userApiKeys && userApiKeys.anthropic) ||
				(provider === "openai" && userApiKeys && userApiKeys.openai) ||
				(provider === "openrouter" && userApiKeys && userApiKeys.openrouter);

			// Update the pre-created message with API key status
			await ctx.runMutation(internal.messages.updateMessageApiKeyStatus, {
				messageId: args.messageId,
				usedUserApiKey: !!willUseUserApiKey,
			});

			// Build conversation messages
			const messages = await buildConversationMessages(
				ctx,
				args.threadId,
				args.modelId as ModelId,
				args.attachments,
				args.webSearchEnabled,
			);

			// Update token usage function
			const updateUsage = async (usage: AISDKUsage) => {
				const formattedUsage = formatUsageData(usage);
				if (formattedUsage) {
					await ctx.runMutation(internal.messages.updateThreadUsageMutation, {
						threadId: args.threadId,
						usage: {
							promptTokens: formattedUsage.inputTokens,
							completionTokens: formattedUsage.outputTokens,
							totalTokens: formattedUsage.totalTokens,
							reasoningTokens: formattedUsage.reasoningTokens,
							cachedTokens: formattedUsage.cachedInputTokens,
							modelId: args.modelId,
						},
					});
				}
			};

			// Create AI client using shared utility
			const ai = createAIClient(args.modelId as ModelId, userApiKeys);

			// Prepare generation options
			const generationOptions: Parameters<typeof streamText>[0] = {
				model: ai,
				messages: messages,
				// Usage will be updated after streaming completes
			};

			// Add web search tool if enabled
			if (args.webSearchEnabled) {
				generationOptions.tools = {
					web_search: createWebSearchTool(),
				};
				// Enable iterative tool calling with stopWhen
				generationOptions.stopWhen = stepCountIs(5); // Allow up to 5 iterations
			}

			// Use the AI SDK v5 streamText
			const result = streamText(generationOptions);

			let fullText = "";
			let hasContent = false;

			// Use fullStream as the unified interface (works with or without tools)
			for await (const streamPart of result.fullStream) {
				// Use the official AI SDK TextStreamPart type
				const part: TextStreamPart<ToolSet> = streamPart;
				switch (part.type) {
					case "text":
						// Handle complete text blocks (in addition to text-delta)
						if (part.text) {
							fullText += part.text;
							hasContent = true;

							// Add text part to the parts array
							await ctx.runMutation(internal.messages.addTextPart, {
								messageId: args.messageId,
								text: part.text,
							});
						}
						break;

					case "reasoning":
						// Handle Claude thinking/reasoning content
						if (part.type === "reasoning" && part.text) {
							await ctx.runMutation(internal.messages.addReasoningPart, {
								messageId: args.messageId,
								text: part.text,
								providerMetadata: part.providerMetadata,
							});
						}
						break;

					case "reasoning-part-finish":
						// Mark reasoning section as complete
						await ctx.runMutation(internal.messages.addStreamControlPart, {
							messageId: args.messageId,
							controlType: "reasoning-part-finish",
						});
						break;

					case "file":
						// Handle generated file content
						if (part.type === "file" && part.file) {
							const file = part.file;
							await ctx.runMutation(internal.messages.addFilePart, {
								messageId: args.messageId,
								url: undefined, // Files don't have URLs in AI SDK
								mediaType: file.mediaType || "application/octet-stream",
								data: file.base64 || file.uint8Array || null,
								filename: undefined, // Files in AI SDK don't have explicit filenames
							});
						}
						break;

					case "source":
						// Handle citation/source references
						if (part.type === "source" && part.sourceType === "url" && part.url) {
							await ctx.runMutation(internal.messages.addSourcePart, {
								messageId: args.messageId,
								sourceType: "url",
								sourceId: part.id || `source_${Date.now()}`,
								url: part.url,
								title: part.title,
								providerMetadata: part.providerMetadata,
							});
						}
						break;


					case "tool-call":
						// Update existing tool call part to "call" state (should exist from tool-call-streaming-start)
						await ctx.runMutation(internal.messages.updateToolCallPart, {
							messageId: args.messageId,
							toolCallId: part.toolCallId,
							args: part.input,
							state: "call",
						});
						break;

					case "tool-call-delta":
						// Update tool call part with streaming arguments
						if (part.type === "tool-call-delta" && part.toolCallId && part.inputTextDelta) {
							await ctx.runMutation(internal.messages.updateToolCallPart, {
								messageId: args.messageId,
								toolCallId: part.toolCallId,
								args: part.inputTextDelta,
								state: "partial-call",
							});
						}
						break;

					case "tool-call-streaming-start":
						// Add tool call part in "partial-call" state
						if (part.type === "tool-call-streaming-start" && part.toolCallId && part.toolName) {
							await ctx.runMutation(internal.messages.addToolCallPart, {
								messageId: args.messageId,
								toolCallId: part.toolCallId,
								toolName: part.toolName,
								state: "partial-call",
							});
						}
						break;

					case "tool-result": {
						// The AI SDK uses 'output' field for tool results, not 'result'
						const toolResult = part.output;

						// Update the tool call part with the result
						await ctx.runMutation(internal.messages.updateToolCallPart, {
							messageId: args.messageId,
							toolCallId: part.toolCallId,
							state: "result",
							result: toolResult,
						});
						break;
					}


					case "start":
						// Handle generation start event
						break;

					case "finish":
						// Handle generation completion event
						if (part.type === "finish") {
							await ctx.runMutation(internal.messages.addStreamControlPart, {
								messageId: args.messageId,
								controlType: "finish",
								finishReason: part.finishReason,
								totalUsage: part.totalUsage,
							});
						}
						break;

					case "start-step":
						// Handle multi-step generation start (step boundary marker)
						await ctx.runMutation(internal.messages.addStepPart, {
							messageId: args.messageId,
							stepType: "start-step",
						});
						break;

					case "finish-step":
						// Handle multi-step generation completion
						await ctx.runMutation(internal.messages.addStepPart, {
							messageId: args.messageId,
							stepType: "finish-step",
						});
						break;


					case "error":
						// Handle stream errors explicitly
						if (part.type === "error") {
							const errorMessage = part.error instanceof Error ? part.error.message : String(part.error || "Unknown stream error");
							console.error("Stream error:", errorMessage);
							
							// Save error as part for debugging
							await ctx.runMutation(internal.messages.addErrorPart, {
								messageId: args.messageId,
								errorMessage: errorMessage,
								errorDetails: part.error,
							});
							
							throw new Error(`Stream error: ${errorMessage}`);
						}
						break;

					case "raw":
						// Handle raw provider responses for debugging
						if (part.type === "raw") {
							await ctx.runMutation(internal.messages.addRawPart, {
								messageId: args.messageId,
								rawValue: part.rawValue,
							});
						}
						break;

					// Handle unknown part types (should never happen with proper AI SDK types)
					default:
						// This should be unreachable with proper TextStreamPart typing
						const _exhaustiveCheck: never = part;
						console.warn("Unknown stream part type:", (_exhaustiveCheck as { type: string }).type, _exhaustiveCheck);
						break;
				}
			}

			// Get final usage with optional chaining
			const finalUsage = await result.usage;
			if (finalUsage) {
				await updateUsage(finalUsage);
			}

			// If we have streamed content, mark the message as complete
			if (hasContent) {
				// Format usage data for the message
				const formattedUsage = formatUsageData(finalUsage);

				await ctx.runMutation(internal.messages.completeStreamingMessage, {
					messageId: args.messageId,
					streamId: args.streamId,
					fullText,
					usage: formattedUsage,
				});
			}

			// Clear generation flag
			await ctx.runMutation(internal.messages.clearGenerationFlag, {
				threadId: args.threadId,
			});
		} catch (error) {
			await handleAIResponseError(ctx, error, args.threadId, args.messageId, {
				modelId: args.modelId,
				provider: getProviderFromModelId(args.modelId as ModelId),
				useStreamingUpdate: true,
			});
		}

		return null;
	},
});

// Internal action to generate AI response using AI SDK v5
export const generateAIResponse = internalAction({
	args: {
		threadId: v.id("threads"),
		userMessage: v.string(),
		modelId: modelIdValidator, // Use validated modelId
		attachments: v.optional(v.array(v.id("files"))),
		webSearchEnabled: v.optional(v.boolean()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		let messageId: Id<"messages"> | undefined = undefined;
		try {
			// Get thread and user information
			const thread = (await ctx.runQuery(internal.messages.getThreadById, {
				threadId: args.threadId,
			})) as { userId: Id<"users"> } | null;
			requireResource(thread, "Thread");

			// Derive provider from modelId
			const provider = getProviderFromModelId(args.modelId as ModelId);

			// Get user's API keys if available
			const userApiKeys = (await ctx.runMutation(
				internal.userSettings.getDecryptedApiKeys,
				{ userId: thread.userId },
			)) as {
				anthropic?: string;
				openai?: string;
				openrouter?: string;
			} | null;

			// Generate unique stream ID and create streaming message
			const streamId = generateStreamId();
			messageId = await createStreamingMessageUtil(
				ctx,
				args.threadId,
				args.modelId as ModelId,
				streamId,
				!!(
					(provider === "anthropic" && userApiKeys?.anthropic) ||
					(provider === "openai" && userApiKeys?.openai) ||
					(provider === "openrouter" && userApiKeys?.openrouter)
				),
			);

			// Build conversation messages
			const messages = await buildConversationMessages(
				ctx,
				args.threadId,
				args.modelId as ModelId,
				args.attachments,
				args.webSearchEnabled,
			);

			console.log(
				`Attempting to call ${provider} with model ID ${args.modelId} and ${messages.length} messages`,
			);
			console.log(`Schema fix timestamp: ${Date.now()}`);
			console.log(`Web search enabled: ${args.webSearchEnabled}`);

			// Stream AI response using shared utility
			const { fullText, usage: finalUsage } = await streamAIResponse(
				ctx,
				args.modelId as ModelId,
				messages,
				messageId,
				userApiKeys,
				args.webSearchEnabled,
			);

			// Update thread usage with final usage
			if (finalUsage) {
				await updateThreadUsageUtil(
					ctx,
					args.threadId,
					args.modelId as ModelId,
					finalUsage,
				);
			}

			// Complete the streaming message
			await ctx.runMutation(internal.messages.completeStreamingMessage, {
				messageId,
				streamId,
				fullText,
				usage: finalUsage ? formatUsageData(finalUsage) : undefined,
			});
		} catch (error) {
			await handleAIResponseError(ctx, error, args.threadId, messageId, {
				modelId: args.modelId,
				provider: getProviderFromModelId(args.modelId as ModelId),
				useStreamingUpdate: !!messageId,
			});
		} finally {
			// Always clear generation flag
			await clearGenerationFlagUtil(ctx, args.threadId);
		}

		return null;
	},
});
