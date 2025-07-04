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
import {
  clientIdValidator,
  messageStatusValidator,
  modelIdValidator,
  modelProviderValidator,
  textPartValidator,
  tokenUsageValidator,
} from "./validators.js";

// Export types
export type {
	MessageUsageUpdate,
	AISDKUsage,
} from "./messages/types.js";

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
		await ctx.db.patch(args.messageId, {
			parts: [{ type: "text", text: args.errorMessage }],
			status: "error",
			thinkingCompletedAt: Date.now(),
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
			parts: [{ type: "text", text: args.errorMessage }],
			timestamp: now,
			role: "assistant", // Use current schema field
			// Keep legacy fields for backward compatibility
			messageType: "assistant",
			model: args.provider,
			modelId: args.modelId,
			status: "error",
			thinkingStartedAt: now,
			thinkingCompletedAt: now,
			metadata: {
				usage: undefined, // Error messages don't have usage data
			},
		});

		return null;
	},
});

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

		// Check if the last part is a text part - if so, merge with it
		if (currentParts.length > 0) {
			const lastPart = currentParts[currentParts.length - 1];
			if (lastPart.type === "text") {
				// Merge with the last text part
				const updatedParts = [
					...currentParts.slice(0, -1), // All parts except the last one
					{
						type: "text" as const,
						text: lastPart.text + args.text, // Concatenate text
					},
				];

				await ctx.db.patch(args.messageId, {
					parts: updatedParts,
				});

				return null;
			}
		}

		// If no existing text part to merge with, add as new part
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
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];

		// Check if the last part is a reasoning part - if so, merge with it
		if (currentParts.length > 0) {
			const lastPart = currentParts[currentParts.length - 1];
			if (lastPart.type === "reasoning") {
				// Merge with the last reasoning part
				const updatedParts = [
					...currentParts.slice(0, -1), // All parts except the last one
					{
						type: "reasoning" as const,
						text: lastPart.text + args.text, // Concatenate text
					},
				];

				await ctx.db.patch(args.messageId, {
					parts: updatedParts,
				});

				return null;
			}
		}

		// If no existing reasoning part to merge with, add as new part
		const updatedParts = [
			...currentParts,
			{
				type: "reasoning" as const,
				text: args.text,
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
			status: "error", // Ensure message status reflects error state
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
			modelId: message.modelId,
		});

		return null;
	},
});

export const addRawPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		rawValue: v.any(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			parts: [{ type: "raw", rawValue: args.rawValue }],
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
		await ctx.db.patch(args.messageId, {
			status: "error",
			parts: [{ type: "text", text: args.error }],
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

		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			parts: [args.part],
			timestamp: now,
			role: "user",
			modelId: args.modelId,
			status: "ready",
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
			timestamp: now,
			role: "assistant",
			modelId: args.modelId,
			status: "submitted",
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
