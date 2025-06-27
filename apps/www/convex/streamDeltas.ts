import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { auth } from "./auth";

/**
 * Stream Delta Management
 *
 * Handles the database side of hybrid streaming:
 * - Writing throttled deltas for multi-client sync
 * - Reading and aggregating deltas for reactive updates
 * - Converting deltas to final message parts
 */

// ===== INTERNAL MUTATIONS =====

/**
 * Add a delta to the stream - called by HybridStreamWriter
 */
export const addDelta = internalMutation({
	args: {
		messageId: v.id("messages"),
		streamId: v.id("streams"),
		sequence: v.number(),
		text: v.string(),
		timestamp: v.number(),
		partType: v.optional(v.string()),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		// Insert the delta
		await ctx.db.insert("streamDeltas", args);

		// Update the message body with aggregated text for search/preview
		// Only do this for text deltas to avoid performance issues
		if (args.partType === "text") {
			const allDeltas = await ctx.db
				.query("streamDeltas")
				.withIndex("by_message", (q) => q.eq("messageId", args.messageId))
				.filter((q) => q.eq(q.field("partType"), "text"))
				.order("asc")
				.collect();

			const aggregatedText = allDeltas
				.sort((a, b) => a.sequence - b.sequence)
				.map((delta) => delta.text)
				.join("");

			await ctx.db.patch(args.messageId, {
				body: aggregatedText,
			});
		}
	},
});

/**
 * Mark a stream as complete and optionally convert deltas to parts
 */
export const completeStream = internalMutation({
	args: {
		streamId: v.id("streams"),
		messageId: v.id("messages"),
		convertToParts: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// Mark stream as done
		await ctx.db.patch(args.streamId, {
			status: "done",
			updatedAt: Date.now(),
		});

		// Mark message as no longer streaming
		await ctx.db.patch(args.messageId, {
			isStreaming: false,
		});

		// Optionally convert deltas to structured parts
		if (args.convertToParts) {
			const deltas = await ctx.db
				.query("streamDeltas")
				.withIndex("by_message", (q) => q.eq("messageId", args.messageId))
				.order("asc")
				.collect();

			const parts = await convertDeltasToParts(deltas);

			await ctx.db.patch(args.messageId, {
				parts,
			});
		}
	},
});

/**
 * Mark a stream as error
 */
export const markStreamError = internalMutation({
	args: {
		streamId: v.id("streams"),
		messageId: v.id("messages"),
		error: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.streamId, {
			status: "error",
			error: args.error,
			updatedAt: Date.now(),
		});

		await ctx.db.patch(args.messageId, {
			isStreaming: false,
		});
	},
});

// ===== PUBLIC QUERIES =====

/**
 * Get streaming text for a message - reactive query for client updates
 */
export const getStreamingText = query({
	args: {
		messageId: v.id("messages"),
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
		isStreaming: v.boolean(),
		error: v.optional(v.string()),
		deltaCount: v.number(),
		lastUpdated: v.optional(v.number()),
	}),
	handler: async (ctx, args) => {
		const userId = await auth.getUserId(ctx);
		if (!userId) {
			throw new Error("Authentication required");
		}

		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		// Check if user has access to this message
		const thread = await ctx.db.get(message.threadId);
		if (!thread || thread.userId !== userId) {
			throw new Error("Access denied");
		}

		// If not streaming, return final state
		if (!message.isStreaming) {
			return {
				text: message.body || "",
				status: "done" as const,
				isStreaming: false,
				deltaCount: 0,
			};
		}

		// Message is streaming - aggregate deltas
		const deltas = await ctx.db
			.query("streamDeltas")
			.withIndex("by_message", (q) => q.eq("messageId", args.messageId))
			.filter((q) => q.eq(q.field("partType"), "text"))
			.order("asc")
			.collect();

		const text = deltas
			.sort((a, b) => a.sequence - b.sequence)
			.map((delta) => delta.text)
			.join("");

		// Get stream status
		const stream = message.streamId
			? await ctx.db.get(message.streamId as Id<"streams">)
			: null;
		const status = stream?.status || "pending";
		const lastUpdated =
			deltas.length > 0
				? Math.max(...deltas.map((d) => d.timestamp))
				: undefined;

		return {
			text,
			status,
			isStreaming: message.isStreaming ?? true,
			error: stream?.error,
			deltaCount: deltas.length,
			lastUpdated,
		};
	},
});

/**
 * Get all deltas for a message - useful for debugging or advanced display
 */
export const getMessageDeltas = query({
	args: {
		messageId: v.id("messages"),
		limit: v.optional(v.number()),
	},
	returns: v.array(
		v.object({
			_id: v.id("streamDeltas"),
			sequence: v.number(),
			text: v.string(),
			timestamp: v.number(),
			partType: v.optional(v.string()),
			metadata: v.optional(v.any()),
		}),
	),
	handler: async (ctx, args) => {
		const userId = await auth.getUserId(ctx);
		if (!userId) {
			throw new Error("Authentication required");
		}

		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		// Check access
		const thread = await ctx.db.get(message.threadId);
		if (!thread || thread.userId !== userId) {
			throw new Error("Access denied");
		}

		const query = ctx.db
			.query("streamDeltas")
			.withIndex("by_message", (q) => q.eq("messageId", args.messageId))
			.order("asc");

		if (args.limit) {
			return await query.take(args.limit);
		}

		return await query.collect();
	},
});

// ===== INTERNAL QUERIES =====

/**
 * Get deltas for internal processing
 */
export const getDeltas = internalQuery({
	args: {
		messageId: v.id("messages"),
		fromSequence: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		let query = ctx.db
			.query("streamDeltas")
			.withIndex("by_message", (q) => q.eq("messageId", args.messageId));

		if (args.fromSequence !== undefined) {
			const fromSequence = args.fromSequence;
			query = query.filter((q) => q.gte(q.field("sequence"), fromSequence));
		}

		return await query.order("asc").collect();
	},
});

// ===== HELPER FUNCTIONS =====

/**
 * Convert deltas to structured message parts
 */
async function convertDeltasToParts(
	deltas: Array<{
		sequence: number;
		text: string;
		partType?: string;
		metadata?: any;
	}>,
): Promise<any[]> {
	const parts = [];

	// Group consecutive text deltas
	let currentTextPart = "";

	for (const delta of deltas.sort((a, b) => a.sequence - b.sequence)) {
		if (delta.partType === "text") {
			currentTextPart += delta.text;
		} else {
			// Flush accumulated text if any
			if (currentTextPart) {
				parts.push({
					type: "text",
					text: currentTextPart,
				});
				currentTextPart = "";
			}

			// Add non-text part
			if (delta.partType === "tool-call") {
				parts.push({
					type: "tool-call",
					toolCallId: delta.metadata?.toolCallId || "unknown",
					toolName: delta.metadata?.toolName || "unknown",
					args: delta.metadata?.args,
					result: delta.metadata?.result,
					state: delta.metadata?.state || "call",
				});
			} else if (delta.partType === "reasoning") {
				parts.push({
					type: "reasoning",
					text: delta.text,
				});
			} else if (delta.partType === "error") {
				parts.push({
					type: "error",
					errorMessage: delta.text,
					errorDetails: delta.metadata,
				});
			}
		}
	}

	// Flush any remaining text
	if (currentTextPart) {
		parts.push({
			type: "text",
			text: currentTextPart,
		});
	}

	return parts;
}
