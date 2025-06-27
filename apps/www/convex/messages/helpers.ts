import type { CoreMessage, TextStreamPart, ToolSet } from "ai";
import { smoothStream, stepCountIs, streamText } from "ai";
import type { Infer } from "convex/values";
import type { ModelId } from "../../src/lib/ai/schemas.js";
import {
	getModelConfig,
	getProviderFromModelId,
	isThinkingMode,
} from "../../src/lib/ai/schemas.js";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx, MutationCtx } from "../_generated/server.js";
import { createAIClient } from "../lib/ai_client.js";
import { getModelStreamingDelay } from "../lib/streaming_config.js";
import type {
	modelIdValidator,
	modelProviderValidator,
} from "../validators.js";
import { createWebSearchTool } from "./tools.js";
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

/**
 * Create initial streaming message (moved from lib/message_service.ts)
 */
export async function createStreamingMessageUtil(
	ctx: ActionCtx,
	threadId: Id<"threads">,
	modelId: ModelId,
	streamId: string,
	usedUserApiKey: boolean,
): Promise<Id<"messages">> {
	const provider = getProviderFromModelId(modelId);

	return await ctx.runMutation(internal.messages.createStreamingMessage, {
		threadId,
		streamId,
		provider,
		modelId,
		usedUserApiKey,
	});
}

/**
 * Update thread usage with retry logic (moved from lib/message_service.ts)
 */
export async function updateThreadUsageUtil(
	ctx: ActionCtx,
	threadId: Id<"threads">,
	modelId: ModelId,
	usage:
		| {
				promptTokens?: number;
				inputTokens?: number;
				completionTokens?: number;
				outputTokens?: number;
				totalTokens?: number;
				completionTokensDetails?: { reasoningTokens?: number };
				reasoningTokens?: number;
				promptTokensDetails?: { cachedTokens?: number };
				cachedInputTokens?: number;
		  }
		| null
		| undefined,
) {
	if (!usage) return;

	const promptTokens = usage.promptTokens || usage.inputTokens || 0;
	const completionTokens = usage.completionTokens || usage.outputTokens || 0;
	const totalTokens = usage.totalTokens || promptTokens + completionTokens;

	await ctx.runMutation(internal.messages.updateThreadUsageMutation, {
		threadId,
		usage: {
			promptTokens,
			completionTokens,
			totalTokens,
			reasoningTokens:
				usage.completionTokensDetails?.reasoningTokens ||
				usage.reasoningTokens ||
				0,
			cachedTokens:
				usage.promptTokensDetails?.cachedTokens || usage.cachedInputTokens || 0,
			modelId,
		},
	});
}

/**
 * Clear generation flag (moved from lib/message_service.ts)
 */
export async function clearGenerationFlagUtil(
	ctx: ActionCtx,
	threadId: Id<"threads">,
) {
	await ctx.runMutation(internal.messages.clearGenerationFlag, {
		threadId,
	});
}

/**
 * Stream AI response (moved from lib/message_service.ts)
 */
export async function streamAIResponse(
	ctx: ActionCtx,
	modelId: ModelId,
	messages: CoreMessage[],
	messageId: Id<"messages">,
	userApiKeys: {
		openai?: string;
		anthropic?: string;
		openrouter?: string;
	} | null,
	webSearchEnabled?: boolean,
) {
	const provider = getProviderFromModelId(modelId);
	const aiClient = createAIClient(modelId, userApiKeys);

	// Prepare generation options
	const generationOptions: Parameters<typeof streamText>[0] = {
		model: aiClient,
		messages,
		temperature: 0.7,
		experimental_transform: smoothStream({
			delayInMs: getModelStreamingDelay(modelId),
			chunking: "word", // Stream word by word
		}),
	};

	// Add web search tool if enabled
	if (webSearchEnabled) {
		generationOptions.tools = {
			web_search: createWebSearchTool(),
		};
		generationOptions.stopWhen = stepCountIs(5);
	}

	// For Claude 4.0 thinking mode, enable thinking/reasoning
	if (provider === "anthropic" && isThinkingMode(modelId)) {
		const modelConfig = getModelConfig(modelId);
		if (modelConfig.thinkingConfig) {
			generationOptions.providerOptions = {
				anthropic: {
					thinking: {
						type: "enabled",
						budgetTokens: modelConfig.thinkingConfig.defaultBudgetTokens,
					},
				},
			};
		}
	}

	// Use the AI SDK v5 streamText
	const result = streamText(generationOptions);

	let fullText = "";
	let hasContent = false;

	// Use fullStream to capture all part types including reasoning
	for await (const streamPart of result.fullStream) {
		const part: TextStreamPart<ToolSet> = streamPart;

		switch (part.type) {
			case "text":
				// Handle text content
				if (part.text) {
					fullText += part.text;
					hasContent = true;

					await ctx.runMutation(internal.messages.addTextPart, {
						messageId,
						text: part.text,
					});
				}
				break;

			case "reasoning":
				// Handle Claude thinking/reasoning content
				if (part.type === "reasoning" && part.text) {
					await ctx.runMutation(internal.messages.addReasoningPart, {
						messageId,
						text: part.text,
						providerMetadata: part.providerMetadata,
					});
				}
				break;

			case "reasoning-part-finish":
				// Mark reasoning section as complete
				await ctx.runMutation(internal.messages.addStreamControlPart, {
					messageId,
					controlType: "reasoning-part-finish",
				});
				break;

			case "tool-call":
				// Handle tool calls
				await ctx.runMutation(internal.messages.updateToolCallPart, {
					messageId,
					toolCallId: part.toolCallId,
					args: part.input,
					state: "call",
				});
				break;

			case "tool-call-streaming-start":
				// Add tool call part in "partial-call" state
				if (
					part.type === "tool-call-streaming-start" &&
					part.toolCallId &&
					part.toolName
				) {
					await ctx.runMutation(internal.messages.addToolCallPart, {
						messageId,
						toolCallId: part.toolCallId,
						toolName: part.toolName,
						state: "partial-call",
					});
				}
				break;

			case "tool-result":
				// Handle tool results
				const toolResult = part.output;
				await ctx.runMutation(internal.messages.updateToolCallPart, {
					messageId,
					toolCallId: part.toolCallId,
					state: "result",
					result: toolResult,
				});
				break;

			case "finish":
				// Handle completion
				if (part.type === "finish") {
					await ctx.runMutation(internal.messages.addStreamControlPart, {
						messageId,
						controlType: "finish",
						finishReason: part.finishReason,
						totalUsage: part.totalUsage,
					});
				}
				break;

			// Skip other part types for now
			default:
				break;
		}
	}

	// Get final usage with optional chaining
	const finalUsage = await result.usage;

	return {
		fullText,
		hasContent,
		usage: finalUsage,
	};
}
