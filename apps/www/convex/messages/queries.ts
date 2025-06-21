import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel.js";
import { internalQuery, query } from "../_generated/server.js";
import {
	branchInfoValidator,
	chunkIdValidator,
	clientIdValidator,
	messageTypeValidator,
	shareIdValidator,
	shareSettingsValidator,
	streamChunkValidator,
	streamIdValidator,
	threadUsageValidator,
} from "../validators.js";
import { messageReturnValidator } from "./types.js";

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

// Query to get stream chunks for resumable streaming
export const getStreamChunks = query({
	args: {
		streamId: streamIdValidator,
		sinceChunkId: v.optional(chunkIdValidator),
	},
	returns: v.object({
		chunks: v.array(streamChunkValidator),
		isComplete: v.boolean(),
		currentBody: v.string(),
		messageId: v.optional(v.id("messages")),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return {
				chunks: [],
				isComplete: true,
				currentBody: "",
				messageId: undefined,
			};
		}

		// Find the message with this streamId
		const message = await ctx.db
			.query("messages")
			.withIndex("by_stream_id", (q) => q.eq("streamId", args.streamId))
			.first();

		if (!message) {
			return {
				chunks: [],
				isComplete: true,
				currentBody: "",
				messageId: undefined,
			};
		}

		// Verify the user owns the thread containing this message
		const thread = await ctx.db.get(message.threadId);
		if (!thread || thread.userId !== userId) {
			return {
				chunks: [],
				isComplete: true,
				currentBody: "",
				messageId: undefined,
			};
		}

		const streamChunks = message.streamChunks || [];

		// If sinceChunkId is provided, filter to only newer chunks
		let newChunks = streamChunks;
		if (args.sinceChunkId) {
			const sinceIndex = streamChunks.findIndex(
				(chunk) => chunk.chunkId === args.sinceChunkId,
			);
			if (sinceIndex >= 0) {
				// Return chunks after the sinceChunkId
				newChunks = streamChunks.slice(sinceIndex + 1);
			}
		}

		return {
			chunks: newChunks,
			isComplete: message.isComplete !== false,
			currentBody: message.body,
			messageId: message._id,
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
