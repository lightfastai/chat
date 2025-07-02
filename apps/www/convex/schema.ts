import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
	branchInfoValidator,
	chatStatusValidator,
	clientIdValidator,
	commentValidator,
	feedbackRatingValidator,
	feedbackReasonsValidator,
	fileMetadataValidator,
	fileNameValidator,
	ipHashValidator,
	messagePartsValidator,
	mimeTypeValidator,
	modelIdValidator,
	modelProviderValidator,
	roleValidator,
	shareIdValidator,
	shareSettingsValidator,
	storageIdValidator,
	threadUsageValidator,
	titleValidator,
	tokenUsageValidator,
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
		apiKeys: userApiKeysValidator,
		preferences: userPreferencesValidator,
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_user", ["userId"]),

	threads: defineTable({
		clientId: v.optional(clientIdValidator), // Client-generated ID for instant navigation
		title: titleValidator,
		userId: v.id("users"),
		createdAt: v.number(),
		lastMessageAt: v.number(),
		isTitleGenerating: v.optional(v.boolean()),
		isGenerating: v.optional(v.boolean()),
		pinned: v.optional(v.boolean()),
		// Branch information
		branchedFrom: branchInfoValidator,
		// Share functionality
		isPublic: v.optional(v.boolean()), // Whether the thread is publicly accessible
		shareId: v.optional(shareIdValidator), // Unique ID for share links
		sharedAt: v.optional(v.number()), // Timestamp when first shared
		shareSettings: shareSettingsValidator,
		// Thread-level usage tracking (denormalized for performance)
		usage: threadUsageValidator,
	})
		.index("by_user", ["userId"])
		.index("by_client_id", ["clientId"])
		.index("by_user_client", ["userId", "clientId"])
		.index("by_share_id", ["shareId"]),

	messages: defineTable({
		threadId: v.id("threads"),
		timestamp: v.optional(v.number()), // Deprecated - use createdAt instead
		messageType: v.optional(roleValidator), // Deprecated - use role instead
		modelId: v.optional(modelIdValidator),
		model: v.optional(modelProviderValidator),
		// Attachments - array of file IDs
		attachments: v.optional(v.array(v.id("files"))),
		thinkingStartedAt: v.optional(v.number()),
		thinkingCompletedAt: v.optional(v.number()),
		usedUserApiKey: v.optional(v.boolean()), // Track if user's own API key was used
		// Token usage tracking per message
		usage: v.optional(tokenUsageValidator),
		// Message parts array following Vercel AI SDK v5 structure
		// Stores text, tool calls, and tool results in chronological order
		// V2 Schema.
		parts: v.optional(messagePartsValidator),
		role: v.optional(roleValidator),
		status: v.optional(chatStatusValidator),
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
		ipHash: ipHashValidator, // Hashed IP for rate limiting
		userAgent: userAgentValidator,
		success: v.boolean(), // Whether the access was successful
	})
		.index("by_share_id", ["shareId"])
		.index("by_share_time", ["shareId", "accessedAt"])
		.index("by_ip_time", ["ipHash", "accessedAt"]),
});
