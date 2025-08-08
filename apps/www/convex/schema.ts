import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
	branchInfoValidator,
	clientIdValidator,
	commentValidator,
	feedbackRatingValidator,
	feedbackReasonsValidator,
	fileMetadataValidator,
	fileNameValidator,
	ipHashValidator,
	messageMetadataValidator,
	messagePartsValidator,
	messageStatusValidator,
	mimeTypeValidator,
	modelIdValidator,
	modelProviderValidator,
	roleValidator,
	shareIdValidator,
	shareSettingsValidator,
	storageIdValidator,
	threadMetadataValidator,
	titleValidator,
	userAgentValidator,
	userApiKeysValidator,
	userPreferencesValidator,
} from "./validators.js";

export default defineSchema({
	...authTables,

	// File storage for attachments
	files: defineTable({
		storageId: storageIdValidator, // Convex storage ID
		fileName: fileNameValidator,
		fileType: mimeTypeValidator, // MIME type
		fileSize: v.number(), // Size in bytes
		uploadedBy: v.id("users"),
		uploadedAt: v.number(),
		// Optional metadata
		metadata: fileMetadataValidator,
	})
		.index("by_user", ["uploadedBy"])
		.index("by_storage_id", ["storageId"]),

	userSettings: defineTable({
		userId: v.id("users"),
		clerkUserId: v.optional(v.string()), // Clerk user ID for direct user identification (optional during migration)
		apiKeys: userApiKeysValidator,
		preferences: userPreferencesValidator,
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_clerk_user", ["clerkUserId"]),

	threads: defineTable({
		clientId: v.optional(clientIdValidator), // Client-generated ID for instant navigation
		title: titleValidator,
		userId: v.id("users"),
		clerkUserId: v.string(), // Clerk user ID for direct user identification (required)
		pinned: v.optional(v.boolean()),
		branchedFrom: branchInfoValidator,
		isPublic: v.optional(v.boolean()), // Whether the thread is publicly accessible
		shareId: v.optional(shareIdValidator), // Unique ID for share links
		sharedAt: v.optional(v.number()), // Timestamp when first shared
		shareSettings: shareSettingsValidator,
		metadata: v.optional(threadMetadataValidator),
		// @deprecated fields - Do not use in new code
		createdAt: v.optional(v.number()),
		isTitleGenerating: v.optional(v.boolean()),
		lastMessageAt: v.optional(v.number()),
		isGenerating: v.optional(v.boolean()),
		usage: v.optional(
			v.object({
				// Old simple format fields (for backward compatibility)
				inputTokens: v.optional(v.number()),
				outputTokens: v.optional(v.number()),
				totalTokens: v.optional(v.number()),
				reasoningTokens: v.optional(v.number()),
				cachedInputTokens: v.optional(v.number()),
				// New aggregated format fields
				totalInputTokens: v.optional(v.number()),
				totalOutputTokens: v.optional(v.number()),
				totalReasoningTokens: v.optional(v.number()),
				totalCachedInputTokens: v.optional(v.number()),
				messageCount: v.optional(v.number()),
				// Model-specific stats
				modelStats: v.optional(
					v.record(
						v.string(),
						v.object({
							inputTokens: v.number(),
							outputTokens: v.number(),
							totalTokens: v.number(),
							reasoningTokens: v.number(),
							cachedInputTokens: v.number(),
							messageCount: v.number(),
						}),
					),
				),
			}),
		),
	})
		.index("by_user", ["userId"])
		.index("by_clerk_user", ["clerkUserId"])
		.index("by_client_id", ["clientId"])
		.index("by_user_client", ["userId", "clientId"])
		.index("by_clerk_user_client", ["clerkUserId", "clientId"])
		.index("by_share_id", ["shareId"]),

	messages: defineTable({
		threadId: v.id("threads"),
		parts: v.optional(messagePartsValidator),
		status: v.optional(messageStatusValidator),
		role: v.optional(roleValidator),
		attachments: v.optional(v.array(v.id("files"))),
		metadata: v.optional(messageMetadataValidator),
		// Legacy fields kept for compatibility
		modelId: v.optional(modelIdValidator),
		usedUserApiKey: v.optional(v.boolean()),
		model: v.optional(modelProviderValidator),
		timestamp: v.optional(v.number()),
		thinkingContent: v.optional(v.string()),
	}).index("by_thread", ["threadId"]),

	feedback: defineTable({
		messageId: v.id("messages"),
		userId: v.id("users"),
		threadId: v.id("threads"),
		rating: feedbackRatingValidator,
		comment: commentValidator,
		reasons: feedbackReasonsValidator,
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_message", ["messageId"])
		.index("by_user_message", ["userId", "messageId"])
		.index("by_thread", ["threadId"]),

	shareAccess: defineTable({
		shareId: shareIdValidator,
		accessedAt: v.number(),
		ipHash: v.optional(ipHashValidator), // Deprecated: Previously used for rate limiting
		userAgent: v.optional(userAgentValidator), // Deprecated: Previously used for logging
		success: v.boolean(), // Whether the access was successful
	})
		.index("by_share_id", ["shareId"])
		.index("by_share_time", ["shareId", "accessedAt"]),
});
