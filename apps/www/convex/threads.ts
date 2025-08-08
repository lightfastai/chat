import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import { mutation, query, type MutationCtx } from "./_generated/server.js";
import { getAuthenticatedUserId } from "./lib/auth.js";
import { getWithOwnership } from "./lib/database.js";
import {
	clientIdValidator,
	clientThreadIdValidator,
	modelIdValidator,
	textPartValidator,
} from "./validators.js";

// Temporary user ID mapping for migration
const USER_ID_TO_CLERK_MAPPING: Record<string, string> = {
	"k9790x60x9wwg6t7xzg7sdbmj57hqa26": "user_30r1XMf2zFdlctUHRkyw9kir7u4",
	"k97adp8es829yanjmkbqkyd3hs7hrhxe": "user_30zLsFGcSsOfimwJOAgdtlSO0ru",
	"k97dt209wbz52xv87qqsjykqan7j2rfp": "user_30zLsGefNSjOERUW3IHo8fWFHHE",
	"k972enf2bvfyk9ktytmhy0n6vd7j4fp8": "user_30zLsMvTa6YB9QTz3I9bWwdvXoP",
	"k977vackk4cseqcmvxk4zvfnas7j66ev": "user_30zLsXOV9u76r633ihzrtu5qX2H",
	"k973yvtmwffq5p6aa865zn35p57j7p90": "user_30zLscy5dYkvEZVI4iMYsIFACv7",
	"k97c0cghpwypm4gxd143dxmmqd7j85ps": "user_30zLsqufawjJjc9qA0B0djm2BjS",
	"k975rgx1d524qwycmvzxsx76w17j93fm": "user_30zLsvKKFHk5cVZLcbbMyuI0R8o",
	"k97ebvm7xx71t9sqy3gt9ybhg57j9kca": "user_30zLt3tAzwbOSolvOQgE0oygtDf",
	"k973j7j6b70ytwe51w5j6rfg7x7j80qt": "user_30zLtCGnPyUDNWF987j61MmPTFt",
	"k97fevgv7sdde3q72x2zddqec57j95he": "user_30zLtC70oXk2LMzveWl0N4lLVRK",
	"k978gnwyt3x385d28cq173pt4d7j973c": "user_30zLtMRCfr5oNai43SD3VChRILj",
	"k9724c7tqr6d3pmzh2wxcvmd5h7j9yex": "user_30zLtQy8ylw3ngRwbXdVvtw9euG",
	"k978vs6nz6q30p9jyg4peakahs7jb2gx": "user_30zLtWtDmF5U06ZZ1BmCdD2yCnm",
	"k9778h9m3c47r92qs4m2mthem97jdebz": "user_30zLteNZqhW89PZPABopKD5WMN6",
	"k97fk08bqasgyr563mr80n9xk57jgqhj": "user_30tqvw9R6sI8WN96yC8TVQUlRVl",
	"k979kv70rb90ebjtwxbxe5r5q97jkmxt": "user_30zLtqqnmRvx5yVj7qpfRfSP7bF",
	"k974dxda31s47y6pwygyazd4x97jjp1k": "user_30zLtstaIhXFD43oEHHZOsiBcUX",
	"k9727yaev3p1hwqmrg7ws9hzyx7jj1tw": "user_30zLu3rD6fjwUHhAviP41vHNlkq",
	"k979g52c5pbz6sm2hgn94yn9457jk0tm": "user_30zLuDxQsc9WKcJGEEvntzpWbHo",
	"k972y2qhs55kw96knxqv75szt57jjjy8": "user_30zLuIeDMpBMVyoYl2VlOUJrU4O",
	"k971h1ar6dzzkmdbxes91d3sfn7jjmy4": "user_30zLuR1Qn1zh8iismi4igecZlaU",
	"k97a51c6s9be5kwecn80smmcm17jtbza": "user_30zLuVyvCEXZRtRU7Or9kwvcRr7",
	"k978thj5gwg8c3mrxs10a9nwxn7jwn2g": "user_30zLuhUXdXINXJZvfZ6iKqYjnC3",
	"k975mz471qckjxrc8p50qbx5kh7jybvj": "user_30zLugflpnRPktgYd5vBI8Pi7Mj",
	"k979xsytsjva4kf77h7d7ssgk17k8bh3": "user_30zLun9qb8yW836LL9qXQbdJg7f",
	"k97bg9b8991sxb5cb8gdjg88bn7kjcfa": "user_30zLux4MJMdS4uk3mGIK1UPouLi",
	"k979w7a5a1y9vmpd9cgx0rbp7s7knjph": "user_30zLv1pC6RtzySxEJJ3vkmADnHp",
	"k974mc23240emcz0qpgjejr8b17mcy51": "user_30zLv8SksvB7o1Qh4OOHA9eO9Dh",
	"k9721nhjgvv6mtf97trycfkds97n4cyt": "user_30zLvIKdtM6icQxFyudBA9KNZiX",
	"k97ad0sb79p39kt0recw4fb8cs7n5vy3": "user_30zLvUNywHUbkt8RHh7KgfvRRK4",
};

// Helper function to get Clerk user ID from Convex user ID
async function getClerkUserIdForUser(_ctx: MutationCtx, userId: Id<"users">): Promise<string | undefined> {
	// Direct mapping from Convex user ID to Clerk user ID
	return USER_ID_TO_CLERK_MAPPING[userId];
}

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

		// Get the Clerk user ID for this user
		const clerkUserId = await getClerkUserIdForUser(ctx, userId);

		const threadId = await ctx.db.insert("threads", {
			clientId: args.clientThreadId,
			title: "", // Empty title indicates it's being generated
			userId: userId,
			clerkUserId: clerkUserId, // Add Clerk user ID
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
