import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.js";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedClerkUserId } from "./lib/auth.js";
import { getOrThrow, getWithClerkOwnership } from "./lib/database.js";
import {
	commentValidator,
	feedbackRatingValidator,
	feedbackReasonsValidator,
} from "./validators";

// Submit or update feedback for a message
export const submitFeedback = mutation({
	args: {
		messageId: v.id("messages"),
		rating: feedbackRatingValidator,
		comment: commentValidator,
		reasons: feedbackReasonsValidator,
	},
	returns: v.id("feedback"),
	handler: async (ctx, args) => {
		const clerkUserId = await getAuthenticatedClerkUserId(ctx);

		// Get the message to find the threadId
		const message = await getOrThrow(ctx.db, "messages", args.messageId);

		// Verify user owns the thread containing this message
		await getWithClerkOwnership(
			ctx.db,
			"threads",
			message.threadId,
			clerkUserId,
		);

		// TODO: Add clerkUserId field to feedback table for proper user filtering
		// For now, we'll skip checking existing feedback since we can't reliably filter by Clerk user ID
		// This means users could potentially create duplicate feedback until we add the clerkUserId field

		const now = Date.now();

		// Temporarily disabled existing feedback check
		// if (existingFeedback) {
		// 	// Update existing feedback
		// 	await ctx.db.patch(existingFeedback._id, {
		// 		rating: args.rating,
		// 		comment: args.comment,
		// 		reasons: args.reasons,
		// 		updatedAt: now,
		// 	});
		// 	return existingFeedback._id;
		// }

		// Create new feedback
		// TODO: Replace userId placeholder with clerkUserId field once added to schema
		return await ctx.db.insert("feedback", {
			messageId: args.messageId,
			userId: "" as Id<"users">, // Placeholder until we add clerkUserId field
			threadId: message.threadId,
			rating: args.rating,
			comment: args.comment,
			reasons: args.reasons,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Remove feedback
export const removeFeedback = mutation({
	args: {
		messageId: v.id("messages"),
	},
	returns: v.null(),
	handler: async (ctx, _args) => {
		// Ensure user is authenticated
		await getAuthenticatedClerkUserId(ctx);

		// TODO: Once clerkUserId field is added to feedback table, filter by clerkUserId
		// For now, we cannot reliably identify user's feedback without clerkUserId field
		// This functionality is temporarily disabled
		// \t.query("feedback")
		// \t.withIndex("by_user_message", (q) =>
		// \t\tq.eq("clerkUserId", clerkUserId).eq("messageId", args.messageId),
		// \t)
		// \t.first();

		// if (feedback) {
		// \tawait ctx.db.delete(feedback._id);
		// }

		return null;
	},
});

// Get feedback for a specific message by the current user
export const getUserFeedbackForMessage = query({
	args: {
		messageId: v.id("messages"),
	},
	returns: v.union(
		v.null(),
		v.object({
			_id: v.id("feedback"),
			_creationTime: v.number(),
			messageId: v.id("messages"),
			userId: v.id("users"),
			threadId: v.id("threads"),
			rating: feedbackRatingValidator,
			comment: commentValidator,
			reasons: feedbackReasonsValidator,
			createdAt: v.number(),
			updatedAt: v.number(),
		}),
	),
	handler: async (ctx, _args) => {
		try {
			// Ensure user is authenticated
			await getAuthenticatedClerkUserId(ctx);

			// TODO: Once clerkUserId field is added to feedback table, filter by clerkUserId
			// For now, return null since we can't reliably identify user's feedback
			// return await ctx.db
			// \t.query("feedback")
			// \t.withIndex("by_clerk_user_message", (q) =>
			// \t\tq.eq("clerkUserId", clerkUserId).eq("messageId", args.messageId),
			// \t)
			// \t.first();
			return null;
		} catch {
			return null;
		}
	},
});

// Get all feedback for a thread (for analytics)
export const getThreadFeedback = query({
	args: {
		threadId: v.id("threads"),
	},
	returns: v.array(
		v.object({
			_id: v.id("feedback"),
			_creationTime: v.number(),
			messageId: v.id("messages"),
			userId: v.id("users"),
			threadId: v.id("threads"),
			rating: feedbackRatingValidator,
			comment: commentValidator,
			reasons: feedbackReasonsValidator,
			createdAt: v.number(),
			updatedAt: v.number(),
		}),
	),
	handler: async (ctx, args) => {
		try {
			const clerkUserId = await getAuthenticatedClerkUserId(ctx);

			// Verify the user owns the thread using Clerk ownership
			await getWithClerkOwnership(
				ctx.db,
				"threads",
				args.threadId,
				clerkUserId,
			);

			return await ctx.db
				.query("feedback")
				.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
				.collect();
		} catch {
			return [];
		}
	},
});
