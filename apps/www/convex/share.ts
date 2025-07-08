import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { nanoid } from "nanoid";
import { mutation, query } from "./_generated/server";
import {
	shareIdValidator,
	shareSettingsValidator,
} from "./validators";

export const shareThread = mutation({
	args: {
		threadId: v.id("threads"),
		settings: v.optional(
			v.object({
				showThinking: v.optional(v.boolean()),
			}),
		),
	},
	returns: v.object({ shareId: shareIdValidator }),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			throw new Error("Unauthorized");
		}

		const thread = await ctx.db.get(args.threadId);
		if (!thread) {
			throw new Error("Thread not found");
		}

		if (thread.userId !== userId) {
			throw new Error("Unauthorized: You don't own this thread");
		}

		const now = Date.now();

		// Handle race condition: if thread is already shared, use existing shareId
		if (thread.isPublic && thread.shareId) {
			// Thread is already shared, just update settings if provided
			if (args.settings) {
				await ctx.db.patch(args.threadId, {
					shareSettings: {
						...thread.shareSettings,
						...args.settings,
					},
				});
			}
			return { shareId: thread.shareId };
		}

		// Generate a unique share ID for new share (24 chars for security)
		const shareId = thread.shareId || nanoid(24);

		await ctx.db.patch(args.threadId, {
			isPublic: true,
			shareId,
			sharedAt: thread.sharedAt || now,
			shareSettings: args.settings ||
				thread.shareSettings || {
					showThinking: false,
				},
		});

		return { shareId };
	},
});

export const unshareThread = mutation({
	args: {
		threadId: v.id("threads"),
	},
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			throw new Error("Unauthorized");
		}

		const thread = await ctx.db.get(args.threadId);
		if (!thread) {
			throw new Error("Thread not found");
		}

		if (thread.userId !== userId) {
			throw new Error("Unauthorized: You don't own this thread");
		}

		await ctx.db.patch(args.threadId, {
			isPublic: false,
		});

		return { success: true };
	},
});

export const updateShareSettings = mutation({
	args: {
		threadId: v.id("threads"),
		settings: v.object({
			showThinking: v.optional(v.boolean()),
		}),
	},
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			throw new Error("Unauthorized");
		}

		const thread = await ctx.db.get(args.threadId);
		if (!thread) {
			throw new Error("Thread not found");
		}

		if (thread.userId !== userId) {
			throw new Error("Unauthorized: You don't own this thread");
		}

		if (!thread.isPublic) {
			throw new Error("Thread is not shared");
		}

		await ctx.db.patch(args.threadId, {
			shareSettings: {
				...thread.shareSettings,
				...args.settings,
			},
		});

		return { success: true };
	},
});

// Mutation to log share access attempts
export const logShareAccess = mutation({
	args: {
		shareId: shareIdValidator,
	},
	returns: v.object({ allowed: v.boolean() }),
	handler: async (ctx, args) => {
		const now = Date.now();

		// Check if thread exists and is public
		const thread = await ctx.db
			.query("threads")
			.withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
			.first();

		const success = !!thread?.isPublic;

		// Log access attempt
		await ctx.db.insert("shareAccess", {
			shareId: args.shareId,
			accessedAt: now,
			success,
		});

		return { allowed: success };
	},
});

// Privacy-focused query to check thread access without logging
export const checkThreadAccess = query({
	args: {
		shareId: shareIdValidator,
	},
	returns: v.object({ allowed: v.boolean() }),
	handler: async (ctx, args) => {
		// Check if thread exists and is public
		const thread = await ctx.db
			.query("threads")
			.withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
			.first();

		return { allowed: !!thread?.isPublic };
	},
});

export const getSharedThread = query({
	args: {
		shareId: shareIdValidator,
	},
	handler: async (ctx, args) => {
		// Find thread by shareId
		const thread = await ctx.db
			.query("threads")
			.withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
			.first();

		if (!thread || !thread.isPublic) {
			return null;
		}

		// Get all messages for the thread
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", thread._id))
			.collect();

		// Filter out thinking content if not allowed
		const filteredMessages = messages.map((msg) => {
			if (
				!thread.shareSettings?.showThinking &&
				msg.parts?.some((part) => part.type === "reasoning")
			) {
				// Remove reasoning parts from message
				return {
					...msg,
					parts: msg.parts?.filter((part) => part.type !== "reasoning"),
				};
			}
			return msg;
		});

		// Get thread owner info (just name/avatar for display)
		const owner = await ctx.db.get(thread.userId);

		return {
			thread: {
				_id: thread._id,
				title: thread.title,
				createdAt: thread.createdAt,
				_creationTime: thread._creationTime,
				shareSettings: thread.shareSettings,
			},
			messages: filteredMessages,
			owner: owner
				? {
						name: owner.name ?? null,
						image: owner.image ?? null,
					}
				: null,
		};
	},
});

export const getThreadShareInfo = query({
	args: {
		threadId: v.id("threads"),
	},
	returns: v.union(
		v.null(),
		v.object({
			isPublic: v.boolean(),
			shareId: v.optional(shareIdValidator),
			sharedAt: v.optional(v.number()),
			shareSettings: shareSettingsValidator,
		}),
	),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return null;
		}

		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== userId) {
			return null;
		}

		return {
			isPublic: thread.isPublic || false,
			shareId: thread.shareId,
			sharedAt: thread.sharedAt,
			shareSettings: thread.shareSettings,
		};
	},
});
