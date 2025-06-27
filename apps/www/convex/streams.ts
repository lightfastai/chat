import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, query } from "./_generated/server";

// Create a new stream with pending status
export const create = internalMutation({
	args: {
		messageId: v.optional(v.id("messages")),
		userId: v.optional(v.id("users")),
		metadata: v.optional(v.any()),
	},
	returns: v.id("streams"),
	handler: async (ctx, args) => {
		const now = Date.now();
		const streamId = await ctx.db.insert("streams", {
			status: "pending",
			messageId: args.messageId,
			userId: args.userId,
			createdAt: now,
			updatedAt: now,
			metadata: args.metadata,
		});
		return streamId;
	},
});

// Add a chunk to a stream
export const addChunk = internalMutation({
	args: {
		streamId: v.id("streams"),
		text: v.string(),
		type: v.optional(
			v.union(
				v.literal("text"),
				v.literal("tool_call"),
				v.literal("tool_result"),
				v.literal("reasoning"),
				v.literal("error"),
				v.literal("control"),
				v.literal("step"),
			),
		),
		metadata: v.optional(v.any()),
		final: v.optional(v.boolean()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const stream = await ctx.db.get(args.streamId);
		if (!stream) {
			throw new Error("Stream not found");
		}

		// Update stream status if needed
		if (stream.status === "pending") {
			await ctx.db.patch(args.streamId, {
				status: "streaming",
				updatedAt: Date.now(),
			});
		} else if (stream.status !== "streaming") {
			throw new Error(`Stream is not in a streaming state: ${stream.status}`);
		}

		// Insert the chunk
		await ctx.db.insert("chunks", {
			streamId: args.streamId,
			text: args.text,
			type: args.type || "text",
			metadata: args.metadata,
			createdAt: Date.now(),
		});

		// Sync to message if we have a messageId
		if (stream.messageId) {
			await ctx.runMutation(internal.messages.syncMessageFromStream, {
				messageId: stream.messageId,
				streamId: args.streamId,
			});
		}

		// Mark as done if final
		if (args.final) {
			await ctx.db.patch(args.streamId, {
				status: "done",
				updatedAt: Date.now(),
			});
		}
	},
});

// Mark stream as complete
export const markComplete = internalMutation({
	args: {
		streamId: v.id("streams"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.streamId, {
			status: "done",
			updatedAt: Date.now(),
		});
	},
});

// Mark stream as errored
export const markError = internalMutation({
	args: {
		streamId: v.id("streams"),
		error: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.streamId, {
			status: "error",
			error: args.error,
			updatedAt: Date.now(),
		});
	},
});

// Get all chunks for a stream
export const getChunks = internalQuery({
	args: {
		streamId: v.id("streams"),
	},
	returns: v.array(
		v.object({
			_id: v.id("chunks"),
			_creationTime: v.number(),
			streamId: v.id("streams"),
			text: v.string(),
			type: v.optional(
				v.union(
					v.literal("text"),
					v.literal("tool_call"),
					v.literal("tool_result"),
					v.literal("reasoning"),
					v.literal("error"),
					v.literal("control"),
					v.literal("step"),
				),
			),
			metadata: v.optional(v.any()),
			createdAt: v.optional(v.number()),
		}),
	),
	handler: async (ctx, args) => {
		const chunks = await ctx.db
			.query("chunks")
			.withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
			.order("asc")
			.collect();

		return chunks;
	},
});

// Get stream body (concatenated text)
export const getStreamBody = query({
	args: {
		streamId: v.id("streams"),
	},
	returns: v.object({
		text: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("streaming"),
			v.literal("done"),
			v.literal("error"),
			v.literal("timeout"),
		),
	}),
	handler: async (ctx, args) => {
		const stream = await ctx.db.get(args.streamId);
		if (!stream) {
			return { text: "", status: "error" as const };
		}

		const chunks = await ctx.db
			.query("chunks")
			.withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
			.order("asc")
			.collect();

		// Concatenate all text chunks
		const text = chunks
			.filter((chunk) => chunk.type === "text" || chunk.type === "reasoning")
			.map((chunk) => chunk.text)
			.join("");

		return {
			text,
			status: stream.status,
		};
	},
});

// Get stream with chunks (for building message parts)
export const getStreamWithChunks = internalQuery({
	args: {
		streamId: v.id("streams"),
	},
	returns: v.union(
		v.null(),
		v.object({
			stream: v.object({
				_id: v.id("streams"),
				_creationTime: v.number(),
				status: v.union(
					v.literal("pending"),
					v.literal("streaming"),
					v.literal("done"),
					v.literal("error"),
					v.literal("timeout"),
				),
				messageId: v.optional(v.id("messages")),
				userId: v.optional(v.id("users")),
				createdAt: v.optional(v.number()),
				updatedAt: v.optional(v.number()),
				error: v.optional(v.string()),
				metadata: v.optional(v.any()),
			}),
			chunks: v.array(
				v.object({
					_id: v.id("chunks"),
					_creationTime: v.number(),
					streamId: v.id("streams"),
					text: v.string(),
					type: v.optional(
						v.union(
							v.literal("text"),
							v.literal("tool_call"),
							v.literal("tool_result"),
							v.literal("reasoning"),
							v.literal("error"),
							v.literal("control"),
							v.literal("step"),
						),
					),
					metadata: v.optional(v.any()),
					createdAt: v.optional(v.number()),
				}),
			),
		}),
	),
	handler: async (ctx, args) => {
		const stream = await ctx.db.get(args.streamId);
		if (!stream) {
			return null;
		}

		const chunks = await ctx.db
			.query("chunks")
			.withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
			.order("asc")
			.collect();

		return { stream, chunks };
	},
});

// Clean up old/timed out streams (for cron job)
export const cleanupExpiredStreams = internalMutation({
	args: {
		maxAgeMs: v.optional(v.number()), // Default 20 minutes
	},
	returns: v.object({
		cleaned: v.number(),
	}),
	handler: async (ctx, args) => {
		const maxAge = args.maxAgeMs || 20 * 60 * 1000; // 20 minutes default (matching persistent-text-streaming)
		const cutoff = Date.now() - maxAge;
		const BATCH_SIZE = 100; // Process in batches to avoid overwhelming the system

		// Find old pending/streaming streams using creation time
		// We check _creationTime instead of createdAt to match persistent-text-streaming
		const expiredStreams = await ctx.db
			.query("streams")
			.withIndex("by_status")
			.filter((q) =>
				q.or(
					q.eq(q.field("status"), "pending"),
					q.eq(q.field("status"), "streaming"),
				),
			)
			.take(BATCH_SIZE); // Limit to batch size

		let cleaned = 0;
		for (const stream of expiredStreams) {
			// Check if stream is actually expired based on creation time
			if (stream._creationTime < cutoff) {
				await ctx.db.patch(stream._id, {
					status: "timeout",
					updatedAt: Date.now(),
				});
				cleaned++;

				// If the stream has a messageId, mark the message as complete (no longer streaming)
				if (stream.messageId) {
					const message = await ctx.db.get(stream.messageId);
					if (message && message.isStreaming) {
						await ctx.db.patch(stream.messageId, {
							isStreaming: false,
							isComplete: true,
						});
					}
				}
			}
		}

		return { cleaned };
	},
});

// Add text chunk (with sentence batching)
export const addTextChunk = internalMutation({
	args: {
		streamId: v.id("streams"),
		text: v.string(),
		final: v.optional(v.boolean()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const result: null = await ctx.runMutation(internal.streams.addChunk, {
			streamId: args.streamId,
			text: args.text,
			type: "text",
			final: args.final,
		});
		return result;
	},
});

// Add tool call chunk
export const addToolCallChunk = internalMutation({
	args: {
		streamId: v.id("streams"),
		toolCallId: v.string(),
		toolName: v.string(),
		args: v.any(),
		state: v.union(v.literal("partial-call"), v.literal("call")),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const result: null = await ctx.runMutation(internal.streams.addChunk, {
			streamId: args.streamId,
			text: JSON.stringify(args.args),
			type: "tool_call",
			metadata: {
				toolCallId: args.toolCallId,
				toolName: args.toolName,
				state: args.state,
			},
		});
		return result;
	},
});

// Add tool result chunk
export const addToolResultChunk = internalMutation({
	args: {
		streamId: v.id("streams"),
		toolCallId: v.string(),
		toolName: v.string(),
		result: v.any(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const result: null = await ctx.runMutation(internal.streams.addChunk, {
			streamId: args.streamId,
			text: JSON.stringify(args.result),
			type: "tool_result",
			metadata: {
				toolCallId: args.toolCallId,
				toolName: args.toolName,
			},
		});
		return result;
	},
});

// Add reasoning chunk
export const addReasoningChunk = internalMutation({
	args: {
		streamId: v.id("streams"),
		text: v.string(),
		providerMetadata: v.optional(v.any()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const result: null = await ctx.runMutation(internal.streams.addChunk, {
			streamId: args.streamId,
			text: args.text,
			type: "reasoning",
			metadata: {
				providerMetadata: args.providerMetadata,
			},
		});
		return result;
	},
});

// Add control chunk (start/finish/reasoning-part-finish)
export const addControlChunk = internalMutation({
	args: {
		streamId: v.id("streams"),
		controlType: v.union(
			v.literal("start"),
			v.literal("finish"),
			v.literal("reasoning-part-finish"),
		),
		finishReason: v.optional(v.string()),
		totalUsage: v.optional(v.any()),
		metadata: v.optional(v.any()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const result: null = await ctx.runMutation(internal.streams.addChunk, {
			streamId: args.streamId,
			text: args.controlType,
			type: "control",
			metadata: {
				controlType: args.controlType,
				finishReason: args.finishReason,
				totalUsage: args.totalUsage,
				...args.metadata,
			},
			final: args.controlType === "finish" ? true : undefined,
		});
		return result;
	},
});
