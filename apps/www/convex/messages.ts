/**
 * Messages API
 *
 * All message-related Convex functions (queries, mutations, actions) are defined here.
 * The messages/ directory contains pure utility functions that are used by these functions.
 * This architecture eliminates circular dependencies by keeping database operations
 * separate from utility functions.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { type Infer, v } from "convex/values";
import { getModelById } from "../src/lib/ai/schemas.js";
import { internal } from "./_generated/api.js";
import type { Doc } from "./_generated/dataModel.js";
import { internalMutation, internalQuery, query } from "./_generated/server.js";
import {
	branchInfoValidator,
	chatStatusValidator,
	clientIdValidator,
	modelIdValidator,
	modelProviderValidator,
	shareIdValidator,
	shareSettingsValidator,
	textPartValidator,
	threadUsageValidator,
	tokenUsageValidator,
} from "./validators.js";

// Import utility functions from messages/ directory
import { updateThreadUsage } from "./messages/helpers.js";
import type { MessageUsageUpdate } from "./messages/types.js";

// Type definitions for multimodal content
type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image"; image: string | URL };
type FilePart = {
	type: "file";
	data: string | URL;
	mediaType: string;
};

export type MultimodalContent = string | Array<TextPart | ImagePart | FilePart>;

// Export types
export type {
	MessageUsageUpdate,
	AISDKUsage,
} from "./messages/types.js";

// ===== QUERIES =====

export const get = query({
	args: {
		messageId: v.id("messages"),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return null;
		}

		const message = await ctx.db.get(args.messageId);
		if (!message) {
			return null;
		}

		// Verify the user owns the thread this message belongs to
		const thread = await ctx.db.get(message.threadId);
		if (!thread || thread.userId !== userId) {
			return null;
		}

		return message;
	},
});

export const listByClientId = query({
	args: {
		clientId: clientIdValidator,
	},
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
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", thread._id))
			.order("desc")
			.take(50);

		// Reverse to show oldest first
		return messages.reverse();
	},
});

export const list = query({
	args: {
		threadId: v.id("threads"),
	},
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

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.order("desc")
			.take(50);

		// Reverse to show oldest first
		return messages.reverse();
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

// Internal function to get recent conversation context
export const getRecentContext = internalQuery({
	args: {
		threadId: v.id("threads"),
	},
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.order("desc")
			.take(10);

		return messages
			.reverse() // Get chronological order
			.filter((msg: Doc<"messages">) => msg.status === "ready") // Only include ready messages
			.map((msg: Doc<"messages">) => ({
				parts: msg.parts,
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

// ===== MUTATIONS =====

// Internal mutation to build message content with attachments
export const buildMessageContent = internalMutation({
	args: {
		text: v.string(),
		attachmentIds: v.optional(v.array(v.id("files"))),
		provider: v.optional(
			v.union(
				v.literal("openai"),
				v.literal("anthropic"),
				v.literal("openrouter"),
			),
		),
		modelId: v.optional(modelIdValidator),
	},
	returns: v.union(
		v.string(),
		v.array(
			v.union(
				v.object({ type: v.literal("text"), text: v.string() }),
				v.object({
					type: v.literal("image"),
					image: v.union(v.string(), v.any()),
				}),
				v.object({
					type: v.literal("file"),
					data: v.union(v.string(), v.any()),
					mediaType: v.string(),
				}),
			),
		),
	),
	handler: async (ctx, args) => {
		// If no attachments, return simple text content
		if (!args.attachmentIds || args.attachmentIds.length === 0) {
			return args.text;
		}

		// Get model configuration to check capabilities
		const modelConfig = args.modelId ? getModelById(args.modelId) : null;
		const hasVisionSupport = modelConfig?.features.vision ?? false;
		const hasPdfSupport = modelConfig?.features.pdfSupport ?? false;

		// Build content array with text and files
		const content = [{ type: "text" as const, text: args.text }] as Array<
			TextPart | ImagePart | FilePart
		>;

		// Fetch each file with its URL
		for (const fileId of args.attachmentIds) {
			const file = await ctx.runQuery(internal.files.getFileWithUrl, {
				fileId,
			});
			if (!file || !file.url) continue;

			// Handle images
			if (file.fileType.startsWith("image/")) {
				if (!hasVisionSupport) {
					// Model doesn't support vision
					if (content[0] && "text" in content[0]) {
						content[0].text += `\n\n[Attached image: ${file.fileName}]\n⚠️ Note: ${modelConfig?.displayName || "This model"} cannot view images. Please switch to GPT-4o, GPT-4o Mini, or any Claude model to analyze this image.`;
					}
				} else {
					// Model supports vision - all models use URLs (no base64 needed)
					content.push({
						type: "image" as const,
						image: file.url,
					});
				}
			}
			// Handle PDFs
			else if (file.fileType === "application/pdf") {
				if (hasPdfSupport && args.provider === "anthropic") {
					// Claude supports PDFs as file type
					content.push({
						type: "file" as const,
						data: file.url,
						mediaType: "application/pdf",
					});
				} else {
					// PDF not supported - add as text description
					const description = `\n[Attached PDF: ${file.fileName} (${(file.fileSize / 1024).toFixed(1)}KB)] - Note: PDF content analysis requires Claude models.`;
					content.push({
						type: "text" as const,
						text: description,
					});
				}
			}
			// For other file types, add as text description
			else {
				const description = `\n[Attached file: ${file.fileName} (${file.fileType}, ${(file.fileSize / 1024).toFixed(1)}KB)]`;

				if (content[0] && "text" in content[0]) {
					content[0].text += description;
				}
			}
		}

		return content;
	},
});

// Internal mutation to update message API key status
export const updateMessageApiKeyStatus = internalMutation({
	args: {
		messageId: v.id("messages"),
		usedUserApiKey: v.boolean(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			usedUserApiKey: args.usedUserApiKey,
		});
		return null;
	},
});

// Internal mutation to update thread usage
export const updateThreadUsageMutation = internalMutation({
	args: {
		threadId: v.id("threads"),
		usage: v.object({
			promptTokens: v.number(),
			completionTokens: v.number(),
			totalTokens: v.number(),
			reasoningTokens: v.number(),
			cachedTokens: v.number(),
			modelId: modelIdValidator,
		}),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { threadId, usage } = args;
		const messageUsage: MessageUsageUpdate = {
			inputTokens: usage.promptTokens,
			outputTokens: usage.completionTokens,
			totalTokens: usage.totalTokens,
			reasoningTokens: usage.reasoningTokens,
			cachedInputTokens: usage.cachedTokens,
		};

		await updateThreadUsage(ctx, threadId, usage.modelId, messageUsage);
		return null;
	},
});

// Internal mutation to update message with error
export const updateMessageError = internalMutation({
	args: {
		messageId: v.id("messages"),
		errorMessage: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			parts: [{ type: "text", text: args.errorMessage }],
			status: "error",
			thinkingCompletedAt: Date.now(),
		});
		return null;
	},
});

// Internal mutation to mark streaming as complete and update thread usage

// Internal mutation to create error message
export const createErrorMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		provider: modelProviderValidator,
		modelId: v.optional(modelIdValidator),
		errorMessage: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const now = Date.now();
		await ctx.db.insert("messages", {
			threadId: args.threadId,
			parts: [{ type: "text", text: args.errorMessage }],
			timestamp: now,
			messageType: "assistant",
			model: args.provider,
			modelId: args.modelId,
			status: "error",
			thinkingStartedAt: now,
			thinkingCompletedAt: now,
			usage: undefined, // Initialize usage tracking
		});

		return null;
	},
});

// Note: updateThinkingState function removed - thinking state is now tracked in parts array

// Note: updateThinkingContent function removed - thinking content is now stored in parts array as reasoning parts

// Internal mutation to clear the generation flag
export const clearGenerationFlag = internalMutation({
	args: {
		threadId: v.id("threads"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.threadId, {
			isGenerating: false,
		});
	},
});

// ===== Message Parts Mutations (Vercel AI SDK v5) =====

// Internal mutation to add a text part to a message
export const addTextPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		text: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];

		// Check if the last part is a text part - if so, merge with it
		if (currentParts.length > 0) {
			const lastPart = currentParts[currentParts.length - 1];
			if (lastPart.type === "text") {
				// Merge with the last text part
				const updatedParts = [
					...currentParts.slice(0, -1), // All parts except the last one
					{
						type: "text" as const,
						text: lastPart.text + args.text, // Concatenate text
					},
				];

				await ctx.db.patch(args.messageId, {
					parts: updatedParts,
				});

				return null;
			}
		}

		// If no existing text part to merge with, add as new part
		const updatedParts = [
			...currentParts,
			{
				type: "text" as const,
				text: args.text,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a reasoning part to a message
export const addReasoningPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		text: v.string(),
		providerMetadata: v.optional(v.any()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];

		// Check if the last part is a reasoning part - if so, merge with it
		if (currentParts.length > 0) {
			const lastPart = currentParts[currentParts.length - 1];
			if (lastPart.type === "reasoning") {
				// Merge with the last reasoning part
				const updatedParts = [
					...currentParts.slice(0, -1), // All parts except the last one
					{
						type: "reasoning" as const,
						text: lastPart.text + args.text, // Concatenate text
						providerMetadata:
							args.providerMetadata || lastPart.providerMetadata,
					},
				];

				await ctx.db.patch(args.messageId, {
					parts: updatedParts,
				});

				return null;
			}
		}

		// If no existing reasoning part to merge with, add as new part
		const updatedParts = [
			...currentParts,
			{
				type: "reasoning" as const,
				text: args.text,
				providerMetadata: args.providerMetadata,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a file part to a message
export const addFilePart = internalMutation({
	args: {
		messageId: v.id("messages"),
		url: v.string(), // Required for type compatibility
		mediaType: v.string(),
		data: v.optional(v.any()),
		filename: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "file" as const,
				url: args.url || "#", // Ensure URL is never undefined
				mediaType: args.mediaType,
				data: args.data,
				filename: args.filename,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a source part to a message
export const addSourcePart = internalMutation({
	args: {
		messageId: v.id("messages"),
		sourceType: v.union(v.literal("url"), v.literal("document")),
		sourceId: v.string(),
		url: v.optional(v.string()),
		title: v.optional(v.string()),
		mediaType: v.optional(v.string()),
		filename: v.optional(v.string()),
		providerMetadata: v.optional(v.any()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "source" as const,
				sourceType: args.sourceType,
				sourceId: args.sourceId,
				url: args.url,
				title: args.title,
				mediaType: args.mediaType,
				filename: args.filename,
				providerMetadata: args.providerMetadata,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add an error part to a message
export const addErrorPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		errorMessage: v.string(),
		errorDetails: v.optional(v.any()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "error" as const,
				errorMessage: args.errorMessage,
				errorDetails: args.errorDetails,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a raw part to a message
export const addRawPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		rawValue: v.any(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "raw" as const,
				rawValue: args.rawValue,
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add step metadata part
export const addStepPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		stepType: v.union(v.literal("start-step"), v.literal("finish-step")),
		metadata: v.optional(v.any()),
		usage: v.optional(v.any()),
		finishReason: v.optional(v.string()),
		warnings: v.optional(v.array(v.any())),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "step" as const,
				stepType: args.stepType,
				...(args.metadata && { metadata: args.metadata }),
				...(args.usage && { usage: args.usage }),
				...(args.finishReason && { finishReason: args.finishReason }),
				...(args.warnings && { warnings: args.warnings }),
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add stream control parts (start, finish, etc.)
export const addStreamControlPart = internalMutation({
	args: {
		messageId: v.id("messages"),
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
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "control" as const,
				controlType: args.controlType,
				...(args.finishReason && { finishReason: args.finishReason }),
				...(args.totalUsage && { totalUsage: args.totalUsage }),
				...(args.metadata && { metadata: args.metadata }),
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to add a tool call part to a message
export const addToolCallPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		toolCallId: v.string(),
		toolName: v.string(),
		args: v.optional(v.any()),
		state: v.optional(
			v.union(
				v.literal("partial-call"),
				v.literal("call"),
				v.literal("result"),
			),
		),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];
		const updatedParts = [
			...currentParts,
			{
				type: "tool-call" as const,
				toolCallId: args.toolCallId,
				toolName: args.toolName,
				args: args.args,
				state: args.state || "call",
			},
		];

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

// Internal mutation to update a tool call part in a message
export const updateToolCallPart = internalMutation({
	args: {
		messageId: v.id("messages"),
		toolCallId: v.string(),
		args: v.optional(v.any()),
		result: v.optional(v.any()),
		state: v.optional(
			v.union(
				v.literal("partial-call"),
				v.literal("call"),
				v.literal("result"),
			),
		),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;

		const currentParts = message.parts || [];

		// Find the tool call part and update its args, result, and/or state
		const updatedParts = currentParts.map((part) => {
			if (part.type === "tool-call" && part.toolCallId === args.toolCallId) {
				return {
					...part,
					...(args.args !== undefined && { args: args.args }),
					...(args.result !== undefined && { result: args.result }),
					...(args.state !== undefined && { state: args.state }),
				};
			}
			return part;
		});

		await ctx.db.patch(args.messageId, {
			parts: updatedParts,
		});

		return null;
	},
});

export const markComplete = internalMutation({
	args: {
		messageId: v.id("messages"),
		usage: v.optional(tokenUsageValidator),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const updateData: any = {
			status: "ready",
		};

		if (args.usage) {
			updateData.usage = args.usage;
		}

		await ctx.db.patch(args.messageId, updateData);

		return null;
	},
});

export const markError = internalMutation({
	args: {
		messageId: v.id("messages"),
		error: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			status: "error",
			parts: [{ type: "text", text: args.error }],
		});

		return null;
	},
});

// Internal mutation to update message status following Vercel AI SDK v5 patterns
export const updateMessageStatus = internalMutation({
	args: {
		messageId: v.id("messages"),
		status: chatStatusValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.messageId, {
			status: args.status,
		});

		return null;
	},
});

export const createUserMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		part: textPartValidator,
		modelId: modelIdValidator,
	},
	returns: v.id("messages"),
	handler: async (ctx, args) => {
		const now = Date.now();

		// Determine status based on message type and streaming state
		const status: Infer<typeof chatStatusValidator> = "ready";

		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			parts: [args.part],
			timestamp: now,
			role: "user",
			modelId: args.modelId,
			status,
		});

		return messageId;
	},
});

export const createAssistantMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		modelId: modelIdValidator,
	},
	returns: v.id("messages"),
	handler: async (ctx, args) => {
		const now = Date.now();

		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			parts: [],
			timestamp: now,
			role: "assistant",
			modelId: args.modelId,
			status: "ready",
		});

		return messageId;
	},
});
