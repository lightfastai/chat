import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import { mutation, query } from "./_generated/server.js";
import { getAuthenticatedUserId } from "./lib/auth.js";
import { getWithOwnership } from "./lib/database.js";
import {
	clientIdValidator,
	clientThreadIdValidator,
	modelIdValidator,
	textPartValidator,
} from "./validators.js";

// List initial threads for preloading (first 20)
export const list = query({
	args: {},
	handler: async (ctx, _args) => {
		try {
			const userId = await getAuthenticatedUserId(ctx);
			// Return first 20 threads for initial preload
			return await ctx.db
				.query("threads")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.order("desc")
				.take(20);
		} catch {
			// Return empty array for unauthenticated users
			return [];
		}
	},
});

// List paginated threads for a user (for infinite scroll)
// Simple pagination for usePaginatedQuery hook
export const listForInfiniteScroll = query({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const userId = await getAuthenticatedUserId(ctx);
		return await ctx.db
			.query("threads")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.filter((q) => q.eq(q.field("pinned"), undefined)) // Only show threads where pinned is undefined (not false)
			.order("desc")
			.paginate(args.paginationOpts);
	},
});

export const listPaginated = query({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		try {
			const userId = await getAuthenticatedUserId(ctx);
			return await ctx.db
				.query("threads")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.filter((q) => q.eq(q.field("pinned"), undefined)) // Only show threads where pinned is undefined (not false)
				.order("desc")
				.paginate(args.paginationOpts);
		} catch {
			// Return empty page for unauthenticated users
			return {
				page: [],
				isDone: true,
				continueCursor: null,
			};
		}
	},
});

export const listPinned = query({
	args: {},
	handler: async (ctx, _args) => {
		try {
			const userId = await getAuthenticatedUserId(ctx);
			return await ctx.db
				.query("threads")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.filter((q) => q.eq(q.field("pinned"), true))
				.order("desc")
				.collect();
		} catch {
			// Return empty array for unauthenticated users
			return [];
		}
	},
});

// Helper function to determine date category for a thread
function getDateCategory(creationTime: number): string {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
	const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
	const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

	const threadDate = new Date(creationTime);

	if (threadDate >= today) return "Today";
	if (threadDate >= yesterday) return "Yesterday";
	if (threadDate >= weekAgo) return "This Week";
	if (threadDate >= monthAgo) return "This Month";
	return "Older";
}

// Create a new thread with optimistic update
export const createThreadWithFirstMessages = mutation({
	args: {
		clientThreadId: clientThreadIdValidator,
		message: textPartValidator,
		modelId: modelIdValidator,
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
			.withIndex("by_client_id", (q) => q.eq("clientId", args.clientThreadId))
			.first();

		if (existing) {
			// Return existing thread ID instead of throwing error for idempotency
			// @todo actually handle this correctly...
			// For now, we need to get the first user message from this thread
			const firstMessage = await ctx.db
				.query("messages")
				.withIndex("by_thread", (q) => q.eq("threadId", existing._id))
				.filter((q) => q.eq(q.field("role"), "user"))
				.order("asc")
				.first();

			// Also get the first assistant message
			const firstAssistantMessage = await ctx.db
				.query("messages")
				.withIndex("by_thread", (q) => q.eq("threadId", existing._id))
				.filter((q) => q.eq(q.field("role"), "assistant"))
				.order("asc")
				.first();

			return {
				threadId: existing._id,
				userMessageId: firstMessage?._id || ("" as Id<"messages">), // Fallback for edge case
				assistantMessageId:
					firstAssistantMessage?._id || ("" as Id<"messages">), // Fallback for edge case
			};
		}

		const threadId = await ctx.db.insert("threads", {
			clientId: args.clientThreadId,
			title: "", // Empty title indicates it's being generated
			userId: userId,
			// Initialize metadata with usage tracking
			metadata: {
				usage: {
					totalInputTokens: 0,
					totalOutputTokens: 0,
					totalTokens: 0,
					totalReasoningTokens: 0,
					totalCachedInputTokens: 0,
					messageCount: 0,
				},
			},
		});

		await ctx.scheduler.runAfter(0, internal.titles.generateTitle, {
			threadId,
			firstMessage: args.message,
		});

		const userMessageId: Id<"messages"> = await ctx.runMutation(
			internal.messages.createUserMessage,
			{
				threadId,
				modelId: args.modelId,
				part: args.message,
			},
		);

		const assistantMessageId: Id<"messages"> = await ctx.runMutation(
			internal.messages.createAssistantMessage,
			{
				threadId,
				modelId: args.modelId,
			},
		);

		return { threadId, userMessageId, assistantMessageId };
	},
});

// List paginated threads with server-side date grouping (5 items per page for smooth loading)
export const listPaginatedWithGrouping = query({
	args: {
		paginationOpts: paginationOptsValidator,
		skipFirst: v.optional(v.number()), // Skip the first N items (for after preload)
	},
	handler: async (ctx, args) => {
		try {
			const userId = await getAuthenticatedUserId(ctx);

			// Build the query
			let query = ctx.db
				.query("threads")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.filter((q) => q.eq(q.field("pinned"), undefined)) // Only show threads where pinned is undefined (not false)
				.order("desc");

			// Skip the first N items only on the first paginated call (no cursor)
			if (args.skipFirst && args.skipFirst > 0 && !args.paginationOpts.cursor) {
				// This is the first paginated call after preload, so we need to skip
				const itemsToSkip = await query.take(args.skipFirst);
				if (itemsToSkip.length === args.skipFirst) {
					// Get the last item's timestamp to continue from there
					const lastSkipped = itemsToSkip[itemsToSkip.length - 1];
					query = ctx.db
						.query("threads")
						.withIndex("by_user", (q) => q.eq("userId", userId))
						.filter((q) =>
							q.and(
								q.eq(q.field("pinned"), undefined),
								q.lt(q.field("_creationTime"), lastSkipped._creationTime),
							),
						)
						.order("desc");
				}
			}

			const result = await query.paginate(args.paginationOpts);

			// Add date categories to each thread
			const threadsWithCategories = result.page.map((thread) => ({
				...thread,
				dateCategory: getDateCategory(thread._creationTime),
			}));

			return {
				page: threadsWithCategories,
				isDone: result.isDone,
				continueCursor: result.continueCursor,
			};
		} catch {
			// Return empty page for unauthenticated users
			return {
				page: [],
				isDone: true,
				continueCursor: null,
			};
		}
	},
});

// Get a specific thread
export const get = query({
	args: {
		threadId: v.id("threads"),
	},
	handler: async (ctx, args) => {
		try {
			const userId = await getAuthenticatedUserId(ctx);
			return await getWithOwnership(ctx.db, "threads", args.threadId, userId);
		} catch {
			// Return null for unauthenticated users or threads they don't own
			return null;
		}
	},
});

// Get a thread by clientId (for instant navigation)
export const getByClientId = query({
	args: {
		clientId: clientIdValidator,
	},
	handler: async (ctx, args) => {
		try {
			const userId = await getAuthenticatedUserId(ctx);
			const thread = await ctx.db
				.query("threads")
				.withIndex("by_user_client", (q) =>
					q.eq("userId", userId).eq("clientId", args.clientId),
				)
				.first();
			return thread;
		} catch {
			// Return null for unauthenticated users
			return null;
		}
	},
});

// Toggle thread pinned state
export const togglePinned = mutation({
	args: {
		threadId: v.id("threads"),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthenticatedUserId(ctx);
		const thread = await getWithOwnership(
			ctx.db,
			"threads",
			args.threadId,
			userId,
		);

		const newPinnedState = !thread.pinned;
		await ctx.db.patch(args.threadId, {
			pinned: newPinnedState,
		});
		return { pinned: newPinnedState };
	},
});
