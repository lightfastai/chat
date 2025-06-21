import type { Infer } from "convex/values";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx, MutationCtx } from "../_generated/server.js";
import { clearGenerationFlag as clearGenerationFlagUtil } from "../lib/message_service.js";
import type {
	modelIdValidator,
	modelProviderValidator,
} from "../validators.js";
import type { MessageUsageUpdate } from "./types.js";

/**
 * Updates thread usage totals with retry logic for concurrent updates
 */
export async function updateThreadUsage(
	ctx: MutationCtx,
	threadId: Id<"threads">,
	model: string,
	messageUsage: MessageUsageUpdate,
) {
	// RACE CONDITION FIX: Retry logic for concurrent updates
	const maxRetries = 3;
	let retryCount = 0;

	while (retryCount < maxRetries) {
		try {
			const thread = await ctx.db.get(threadId);
			if (!thread) return;

			const inputTokens = messageUsage.inputTokens || 0;
			const outputTokens = messageUsage.outputTokens || 0;
			const totalTokens =
				messageUsage.totalTokens || inputTokens + outputTokens;
			const reasoningTokens = messageUsage.reasoningTokens || 0;
			const cachedInputTokens = messageUsage.cachedInputTokens || 0;

			// Get existing usage or initialize
			const currentUsage = thread.usage || {
				totalInputTokens: 0,
				totalOutputTokens: 0,
				totalTokens: 0,
				totalReasoningTokens: 0,
				totalCachedInputTokens: 0,
				messageCount: 0,
				modelStats: {},
			};

			// Get model-specific ID (e.g., "claude-sonnet-4-20250514" instead of just "anthropic")
			const modelId = getFullModelId(model);

			// Update totals
			const newUsage = {
				totalInputTokens: currentUsage.totalInputTokens + inputTokens,
				totalOutputTokens: currentUsage.totalOutputTokens + outputTokens,
				totalTokens: currentUsage.totalTokens + totalTokens,
				totalReasoningTokens:
					currentUsage.totalReasoningTokens + reasoningTokens,
				totalCachedInputTokens:
					currentUsage.totalCachedInputTokens + cachedInputTokens,
				messageCount: currentUsage.messageCount + 1,
				modelStats: {
					...currentUsage.modelStats,
					[modelId]: {
						messageCount:
							(currentUsage.modelStats?.[modelId]?.messageCount || 0) + 1,
						inputTokens:
							(currentUsage.modelStats?.[modelId]?.inputTokens || 0) +
							inputTokens,
						outputTokens:
							(currentUsage.modelStats?.[modelId]?.outputTokens || 0) +
							outputTokens,
						totalTokens:
							(currentUsage.modelStats?.[modelId]?.totalTokens || 0) +
							totalTokens,
						reasoningTokens:
							(currentUsage.modelStats?.[modelId]?.reasoningTokens || 0) +
							reasoningTokens,
						cachedInputTokens:
							(currentUsage.modelStats?.[modelId]?.cachedInputTokens || 0) +
							cachedInputTokens,
					},
				},
			};

			// Update thread with new usage
			await ctx.db.patch(threadId, { usage: newUsage });
			return; // Success, exit retry loop
		} catch (error) {
			retryCount++;
			console.log(
				`Usage update retry ${retryCount}/${maxRetries} for thread ${threadId}`,
			);

			if (retryCount >= maxRetries) {
				console.error(
					`Failed to update thread usage after ${maxRetries} retries:`,
					error,
				);
				throw error;
			}

			// Note: In mutations, we can't use setTimeout for delays
			// The retry will happen immediately, relying on Convex's internal conflict resolution
		}
	}
}

/**
 * Helper to get full model ID for consistent tracking across providers
 */
export function getFullModelId(model: string): string {
	// If it's already a full model ID, return as-is
	if (model.includes("-")) {
		return model;
	}

	// Otherwise, convert provider names to default model IDs
	switch (model) {
		case "anthropic":
			return "claude-3-5-sonnet-20241022";
		case "openai":
			return "gpt-4o-mini";
		default:
			return model;
	}
}

/**
 * Generates a unique stream ID for message streaming
 */
export function generateStreamId(): string {
	return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique chunk ID for stream chunks
 */
export function generateChunkId(): string {
	return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handle errors in AI response generation with proper cleanup
 * Ensures generation flag is always cleared to prevent thread lock
 */
export async function handleAIResponseError(
	ctx: ActionCtx,
	error: unknown,
	threadId: Id<"threads">,
	messageId?: Id<"messages">,
	options?: {
		modelId?: string;
		provider?: string;
		useStreamingUpdate?: boolean;
	},
): Promise<void> {
	console.error("Error in AI response generation:", error);

	// Add specific error details for debugging
	if (error instanceof Error) {
		console.error(`Error name: ${error.name}`);
		console.error(`Error message: ${error.message}`);
		if (error.stack) {
			console.error(`Error stack: ${error.stack.substring(0, 500)}...`);
		}
	}

	const errorMessage = `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}. Please check your API keys.`;

	try {
		if (messageId && options?.useStreamingUpdate) {
			// For streaming messages, update content and mark as complete
			await ctx.runMutation(internal.messages.updateStreamingMessage, {
				messageId,
				content: errorMessage,
			});
			await ctx.runMutation(internal.messages.completeStreamingMessageLegacy, {
				messageId,
			});
		} else if (messageId) {
			// Update existing message with error
			await ctx.runMutation(internal.messages.updateMessageError, {
				messageId,
				errorMessage,
			});
		} else if (options?.provider) {
			// Create new error message
			const streamId = generateStreamId();
			await ctx.runMutation(internal.messages.createErrorMessage, {
				threadId,
				streamId,
				provider: options.provider as Infer<typeof modelProviderValidator>,
				modelId: options.modelId as Infer<typeof modelIdValidator>,
				errorMessage,
			});
		}
	} catch (errorHandlingError) {
		console.error("Error during error handling:", errorHandlingError);
	} finally {
		// CRITICAL: Always clear generation flag, even if error handling fails
		try {
			await clearGenerationFlagUtil(ctx, threadId);
		} catch (flagClearError) {
			console.error(
				"CRITICAL: Failed to clear generation flag:",
				flagClearError,
			);
			// This is a critical error that could leave the thread in a locked state
		}
	}
}
