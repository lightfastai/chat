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
	messagesDeprecatedValidator,
	mimeTypeValidator,
	roleValidator,
	shareIdValidator,
	shareSettingsValidator,
	storageIdValidator,
	threadDeprecatedValidator,
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
		apiKeys: userApiKeysValidator,
		preferences: userPreferencesValidator,
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_user", ["userId"]),

	threads: defineTable({
		clientId: v.optional(clientIdValidator), // Client-generated ID for instant navigation
		title: titleValidator,
		userId: v.id("users"),
		pinned: v.optional(v.boolean()),
		branchedFrom: branchInfoValidator,
		isPublic: v.optional(v.boolean()), // Whether the thread is publicly accessible
		shareId: v.optional(shareIdValidator), // Unique ID for share links
		sharedAt: v.optional(v.number()), // Timestamp when first shared
		shareSettings: shareSettingsValidator,
		metadata: v.optional(threadMetadataValidator),
		// @deprecated fields - Do not use in new code
		...threadDeprecatedValidator.fields,
	})
		.index("by_user", ["userId"])
		.index("by_client_id", ["clientId"])
		.index("by_user_client", ["userId", "clientId"])
		.index("by_share_id", ["shareId"]),

	messages: defineTable({
		// @V2 Schema.
		threadId: v.id("threads"),
		parts: v.optional(messagePartsValidator),
		status: v.optional(messageStatusValidator),
		role: v.optional(roleValidator),
		attachments: v.optional(v.array(v.id("files"))),
		// New metadata structure
		metadata: v.optional(messageMetadataValidator),
		// @deprecated fields - Do not use in new code
		...messagesDeprecatedValidator.fields,
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
