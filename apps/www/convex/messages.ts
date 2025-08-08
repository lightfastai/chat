/**
 * Messages API
 *
 * All message-related Convex functions (queries, mutations, actions) are defined here.
 * The messages/ directory contains pure utility functions that are used by these functions.
 * This architecture eliminates circular dependencies by keeping database operations
 * separate from utility functions.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import { internalMutation, mutation, query } from "./_generated/server.js";
import type { DbMessagePart, DbReasoningPart, DbTextPart } from "./types.js";
import {
	addErrorPartArgsValidator,
	addFilePartArgsValidator,
	addRawPartArgsValidator,
	addReasoningPartArgsValidator,
	addSourceDocumentPartArgsValidator,
	addSourceUrlPartArgsValidator,
	addTextPartArgsValidator,
	addToolCallPartArgsValidator,
	addToolInputStartPartArgsValidator,
	addToolResultPartArgsValidator,
	clientIdValidator,
	messageStatusValidator,
	modelIdValidator,
	modelProviderValidator,
	textPartValidator,
	tokenUsageValidator,
} from "./validators.js";

// ===== QUERIES =====

export const get = query({
	args: {
		messageId: v.id("messages"),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return null;
		}

		const message = await ctx.db.get(args.messageId);
		if (!message) {
			return null;
		}

		// Verify the user owns the thread this message belongs to
		const thread = await ctx.db.get(message.threadId);
		if (!thread || thread.userId !== userId) {
			return null;
		}

		return message;
	},
});

export const listByClientId = query({
	args: {
		clientId: clientIdValidator,
	},
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
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", thread._id))
			.order("desc")
			.take(50);

		// Reverse to show oldest first
		return messages.reverse();
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
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		const defaultUsage = {
			totalInputTokens: 0,
			totalOutputTokens: 0,
			totalTokens: 0,
			totalReasoningTokens: 0,
			totalCachedInputTokens: 0,
			messageCount: 0,
		};

		if (!userId) return defaultUsage;

		// Verify the user owns this thread
		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== userId) return defaultUsage;

		// Return usage from thread metadata (fast O(1) lookup!)
		const usage = thread.metadata?.usage;
		if (!usage) return defaultUsage;

		return {
			totalInputTokens: usage.totalInputTokens,
			totalOutputTokens: usage.totalOutputTokens,
			totalTokens: usage.totalTokens,
			totalReasoningTokens: usage.totalReasoningTokens,
			totalCachedInputTokens: usage.totalCachedInputTokens,
			messageCount: usage.messageCount,
		};
	},
});

// ===== MUTATIONS =====

// Internal mutation to update message with error
export const updateMessageError = internalMutation({
	args: {
		messageId: v.id("messages"),
		errorMessage: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const now = Date.now();
		await ctx.db.patch(args.messageId, {
			parts: [{ type: "text", text: args.errorMessage, timestamp: now }],
			status: "error",
		});
		return null;
	},
});

// Internal mutation to mark streaming as complete and update thread usage

// Internal mutation to create error message
export const createErrorMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		provider: modelProviderValidator,
		modelId: v.optional(modelIdValidator),
		errorMessage: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const now = Date.now();
		await ctx.db.insert("messages", {
			threadId: args.threadId,
			parts: [{ type: "text", text: args.errorMessage, timestamp: now }],
			role: "assistant",
			status: "error",
			metadata: {
				model: args.modelId,
				provider: args.provider,
				thinkingStartedAt: now,
				thinkingCompletedAt: now,
				usage: undefined, // Error messages don't have usage data
			},
			// Keep legacy fields for backward compatibility during migration
			timestamp: now,
			model: args.provider,
			modelId: args.modelId,
		});

		return null;
	},
});

// Internal mutation to add a text part to a message
export const addTextPart = internalMutation({
	args: addTextPartArgsValidator,
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];

		// Create new text part with timestamp - each chunk is independent
		const newPart: DbTextPart = {
			type: "text" as const,
			text: args.text,
			timestamp: args.timestamp,
		};

		// Simply append the new part - sorting happens on client side
		const updatedParts: DbMessagePart[] = [...currentParts, newPart];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a reasoning part to a message
export const addReasoningPart = internalMutation({
	args: addReasoningPartArgsValidator,
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts: DbMessagePart[] = message.parts || [];

		// Create new reasoning part with timestamp - each chunk is independent
		const newPart: DbReasoningPart = {
			type: "reasoning" as const,
			text: args.text,
			timestamp: args.timestamp,
		};

		// Simply append the new part - sorting happens on client side
		const updatedParts: DbMessagePart[] = [...currentParts, newPart];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add an error part to a message
export const addErrorPart = internalMutation({
	args: addErrorPartArgsValidator,
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const now = Date.now();
		const updatedParts = [
			...currentParts,
			{
				type: "error" as const,
				errorMessage: args.errorMessage,
				errorDetails: args.errorDetails,
				timestamp: now,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
			status: "error", // Ensure message status reflects error state
		});

		return null;
	},
});

// Internal mutation to add a tool input start part to a message
export const addToolInputStartPart = internalMutation({
	args: addToolInputStartPartArgsValidator,
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "tool-input-start" as const,
				toolCallId: args.toolCallId,
				timestamp: args.timestamp,
				args: args.args,
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
	args: addToolCallPartArgsValidator,
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
				timestamp: args.timestamp,
				args: args.args,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to update a tool call part in a message
export const addToolResultCallPart = internalMutation({
	args: addToolResultPartArgsValidator,
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];

		const updatedParts: DbMessagePart[] = [
			...currentParts,
			{
				type: "tool-result" as const,
				toolCallId: args.toolCallId,
				timestamp: args.timestamp,
				args: args.args,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

export const addSourceUrlPart = internalMutation({
	args: addSourceUrlPartArgsValidator,
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts: DbMessagePart[] = [
			...currentParts,
			{
				type: "source-url" as const,
				sourceId: args.sourceId,
				url: args.url,
				title: args.title,
				timestamp: args.timestamp,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

export const addSourceDocumentPart = internalMutation({
	args: addSourceDocumentPartArgsValidator,
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts: DbMessagePart[] = [
			...currentParts,
			{
				type: "source-document" as const,
				sourceId: args.sourceId,
				mediaType: args.mediaType,
				title: args.title,
				filename: args.filename,
				timestamp: args.timestamp,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

export const addFilePart = internalMutation({
	args: addFilePartArgsValidator,
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts: DbMessagePart[] = [
			...currentParts,
			{
				type: "file" as const,
				mediaType: args.mediaType,
				filename: args.filename,
				url: args.url,
				timestamp: args.timestamp,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to update message usage in metadata
export const updateMessageUsage = internalMutation({
	args: {
		messageId: v.id("messages"),
		usage: v.optional(tokenUsageValidator),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		// Update metadata.usage field
		await ctx.db.patch(args.messageId, {
			metadata: {
				...message.metadata,
				usage: args.usage,
			},
		});

		return null;
	},
});

// Internal mutation to update thread usage in metadata with real-time aggregation
export const updateThreadUsage = internalMutation({
	args: {
		threadId: v.id("threads"),
		messageUsage: v.optional(tokenUsageValidator),
		modelId: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const thread = await ctx.db.get(args.threadId);
		if (!thread || !args.messageUsage) return null;

		const currentUsage = thread.metadata?.usage || {
			totalInputTokens: 0,
			totalOutputTokens: 0,
			totalTokens: 0,
			totalReasoningTokens: 0,
			totalCachedInputTokens: 0,
			messageCount: 0,
		};

		// Aggregate usage from message
		const inputTokens = args.messageUsage.inputTokens || 0;
		const outputTokens = args.messageUsage.outputTokens || 0;
		const totalTokens =
			args.messageUsage.totalTokens || inputTokens + outputTokens;
		const reasoningTokens = args.messageUsage.reasoningTokens || 0;
		const cachedInputTokens = args.messageUsage.cachedInputTokens || 0;

		// Update totals
		const updatedUsage = {
			totalInputTokens: currentUsage.totalInputTokens + inputTokens,
			totalOutputTokens: currentUsage.totalOutputTokens + outputTokens,
			totalTokens: currentUsage.totalTokens + totalTokens,
			totalReasoningTokens: currentUsage.totalReasoningTokens + reasoningTokens,
			totalCachedInputTokens:
				currentUsage.totalCachedInputTokens + cachedInputTokens,
			messageCount: currentUsage.messageCount + 1,
		};

		// Update thread metadata
		await ctx.db.patch(args.threadId, {
			metadata: {
				...thread.metadata,
				usage: updatedUsage,
			},
		});

		return null;
	},
});

// Legacy addUsage for backward compatibility
export const addUsage = internalMutation({
	args: {
		messageId: v.id("messages"),
		usage: v.optional(tokenUsageValidator),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		// Get message to find threadId
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		// Update message usage
		await ctx.runMutation(internal.messages.updateMessageUsage, {
			messageId: args.messageId,
			usage: args.usage,
		});

		// Update thread usage aggregation
		await ctx.runMutation(internal.messages.updateThreadUsage, {
			threadId: message.threadId,
			messageUsage: args.usage,
			modelId: message.modelId || message.metadata?.model,
		});

		return null;
	},
});

export const addRawPart = internalMutation({
	args: addRawPartArgsValidator,
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			parts: [
				{ type: "raw", rawValue: args.rawValue, timestamp: args.timestamp },
			],
		});

		return null;
	},
});

// Legacy function - use addErrorPart + updateMessageStatus instead
// @deprecated - Remove after confirming no usage
export const markError = internalMutation({
	args: {
		messageId: v.id("messages"),
		error: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const now = Date.now();
		await ctx.db.patch(args.messageId, {
			status: "error",
			parts: [{ type: "text", text: args.error, timestamp: now }],
		});

		return null;
	},
});

// Internal mutation to update message status following Vercel AI SDK v5 patterns
export const updateMessageStatus = internalMutation({
	args: {
		messageId: v.id("messages"),
		status: messageStatusValidator,
	},
	returns: v.union(
		v.object({
			previousStatus: v.optional(messageStatusValidator),
			updated: v.boolean(),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) {
			return null;
		}

		const previousStatus = message.status;

		// Only update if status is actually changing
		if (previousStatus !== args.status) {
			await ctx.db.patch(args.messageId, {
				status: args.status,
			});
			return {
				previousStatus,
				updated: true,
			};
		}

		return {
			previousStatus,
			updated: false,
		};
	},
});

export const createUserMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		part: textPartValidator,
		modelId: modelIdValidator,
	},
	returns: v.id("messages"),
	handler: async (ctx, args) => {
		const now = Date.now();

		// Ensure user message part has timestamp
		const partWithTimestamp = {
			...args.part,
			timestamp: args.part.timestamp || now,
		};

		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			parts: [partWithTimestamp],
			role: "user",
			status: "ready",
			metadata: {
				model: args.modelId,
			},
			// Keep legacy fields for backward compatibility during migration
			timestamp: now,
			modelId: args.modelId,
		});

		return messageId;
	},
});

export const createAssistantMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		modelId: modelIdValidator,
	},
	returns: v.id("messages"),
	handler: async (ctx, args) => {
		const now = Date.now();

		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			parts: [],
			role: "assistant",
			status: "submitted",
			metadata: {
				model: args.modelId,
			},
			// Keep legacy fields for backward compatibility during migration
			timestamp: now,
			modelId: args.modelId,
		});

		return messageId;
	},
});

// Mutation to create messages in existing threads (for optimistic updates)
export const createSubsequentMessages = mutation({
	args: {
		threadId: v.id("threads"),
		message: textPartValidator,
		modelId: modelIdValidator,
	},
	returns: v.object({
		userMessageId: v.id("messages"),
		assistantMessageId: v.id("messages"),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			throw new Error("Not authenticated");
		}

		// Verify the user owns this thread
		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== userId) {
			throw new Error("Thread not found");
		}

		// Create user message
		const userMessageId: Id<"messages"> = await ctx.runMutation(
			internal.messages.createUserMessage,
			{
				threadId: args.threadId,
				part: args.message,
				modelId: args.modelId,
			},
		);

		// Create assistant message placeholder
		const assistantMessageId: Id<"messages"> = await ctx.runMutation(
			internal.messages.createAssistantMessage,
			{
				threadId: args.threadId,
				modelId: args.modelId,
			},
		);

		return {
			userMessageId,
			assistantMessageId,
		};
	},
});
