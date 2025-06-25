import { type CoreMessage, stepCountIs, streamText } from "ai";
import { v } from "convex/values";
import {
	type ModelId,
	getProviderFromModelId,
} from "../../src/lib/ai/schemas.js";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import { internalAction } from "../_generated/server.js";
import { createAIClient } from "../lib/ai_client.js";
import { createWebSearchTool } from "../lib/ai_tools.js";
import { requireResource } from "../lib/errors.js";
import {
	buildMessageContent,
	createSystemPrompt,
} from "../lib/message_builder.js";
import {
	buildConversationMessages,
	clearGenerationFlag as clearGenerationFlagUtil,
	createStreamingMessage as createStreamingMessageUtil,
	streamAIResponse,
	updateThreadUsage as updateThreadUsageUtil,
} from "../lib/message_service.js";
import { modelIdValidator, streamIdValidator } from "../validators.js";
import { generateStreamId, handleAIResponseError } from "./helpers.js";
import { type AISDKUsage, formatUsageData } from "./types.js";

// New action that uses pre-created message ID
export const generateAIResponseWithMessage = internalAction({
	args: {
		threadId: v.id("threads"),
		userMessage: v.string(),
		modelId: modelIdValidator,
		attachments: v.optional(v.array(v.id("files"))),
		webSearchEnabled: v.optional(v.boolean()),
		messageId: v.id("messages"), // Pre-created message ID
		streamId: streamIdValidator, // Pre-generated stream ID
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		try {
			// Since this is called from createThreadAndSend, we know the thread exists
			// We just need to get the userId for API key retrieval
			const thread = await ctx.runQuery(internal.messages.getThreadById, {
				threadId: args.threadId,
			});
			requireResource(thread, "Thread");

			// Derive provider from modelId
			const provider = getProviderFromModelId(args.modelId as ModelId);

			// Get user's API keys if available
			const userApiKeys = await ctx.runMutation(
				internal.userSettings.getDecryptedApiKeys,
				{ userId: thread.userId },
			);

			// Determine if user's API key will be used
			const willUseUserApiKey =
				(provider === "anthropic" && userApiKeys && userApiKeys.anthropic) ||
				(provider === "openai" && userApiKeys && userApiKeys.openai) ||
				(provider === "openrouter" && userApiKeys && userApiKeys.openrouter);

			// Update the pre-created message with API key status
			await ctx.runMutation(internal.messages.updateMessageApiKeyStatus, {
				messageId: args.messageId,
				usedUserApiKey: !!willUseUserApiKey,
			});

			// Get recent conversation context
			const recentMessages = await ctx.runQuery(
				internal.messages.getRecentContext,
				{ threadId: args.threadId },
			);

			// Prepare system prompt based on model capabilities
			const systemPrompt = createSystemPrompt(
				args.modelId,
				args.webSearchEnabled,
			);

			// Prepare messages for AI SDK v5 with multimodal support
			const messages: CoreMessage[] = [
				{
					role: "system",
					content: systemPrompt,
				},
			];

			// Build conversation history with attachments
			for (let i = 0; i < recentMessages.length; i++) {
				const msg = recentMessages[i];
				const isLastUserMessage =
					i === recentMessages.length - 1 && msg.messageType === "user";

				// For the last user message, include the current attachments
				const attachmentsToUse =
					isLastUserMessage && args.attachments
						? args.attachments
						: msg.attachments;

				// Build message content with attachments
				const content = await buildMessageContent(
					ctx,
					msg.body,
					attachmentsToUse,
					provider,
					args.modelId,
				);

				messages.push({
					role: msg.messageType === "user" ? "user" : "assistant",
					content,
				} as CoreMessage);
			}

			// Create AI client using shared utility
			const ai = createAIClient(args.modelId as ModelId, userApiKeys);

			// Update token usage function
			const updateUsage = async (usage: AISDKUsage) => {
				if (usage) {
					const promptTokens = usage.promptTokens || 0;
					const completionTokens = usage.completionTokens || 0;
					const totalTokens =
						usage.totalTokens || promptTokens + completionTokens;

					await ctx.runMutation(internal.messages.updateThreadUsageMutation, {
						threadId: args.threadId,
						usage: {
							promptTokens,
							completionTokens,
							totalTokens,
							reasoningTokens:
								usage.completionTokensDetails?.reasoningTokens || 0,
							cachedTokens: usage.promptTokensDetails?.cachedTokens || 0,
							modelId: args.modelId,
						},
					});
				}
			};

			// Prepare generation options
			const generationOptions: Parameters<typeof streamText>[0] = {
				model: ai,
				messages: messages,
				// Usage will be updated after streaming completes
			};

			// Add web search tool if enabled
			if (args.webSearchEnabled) {
				generationOptions.tools = {
					web_search: createWebSearchTool(),
				};
				// Enable iterative tool calling with stopWhen
				generationOptions.stopWhen = stepCountIs(5); // Allow up to 5 iterations
			}

			// Use the AI SDK v5 streamText
			const result = streamText(generationOptions);

			let fullText = "";
			let hasContent = false;

			// Use fullStream as the unified interface (works with or without tools)
			for await (const streamPart of result.fullStream) {
				const part = streamPart as any;
				switch (part.type) {
					case "text-delta":
						if (part.textDelta) {
							fullText += part.textDelta;
							hasContent = true;

							// Add text part to the parts array
							await ctx.runMutation(internal.messages.addTextPart, {
								messageId: args.messageId,
								text: part.textDelta,
							});
						}
						break;

					case "text":
						// Handle complete text blocks (in addition to text-delta)
						if (part.text) {
							fullText += part.text;
							hasContent = true;

							// Add text part to the parts array
							await ctx.runMutation(internal.messages.addTextPart, {
								messageId: args.messageId,
								text: part.text,
							});
						}
						break;

					case "tool-call":
						// Update existing tool call part to "call" state (should exist from tool-call-streaming-start)
						await ctx.runMutation(internal.messages.updateToolCallPart, {
							messageId: args.messageId,
							toolCallId: part.toolCallId,
							args: part.args,
							state: "call",
						});
						break;

					case "tool-call-delta":
						// Update tool call part with streaming arguments
						if (part.toolCallId && part.argsTextDelta) {
							await ctx.runMutation(internal.messages.updateToolCallPart, {
								messageId: args.messageId,
								toolCallId: part.toolCallId,
								args: part.args, // Use the parsed args from the SDK
								state: "partial-call",
							});
						}
						break;

					case "tool-result":
						// The AI SDK uses 'output' field for tool results, not 'result'
						const toolResult = part.output || part.result;
						
						// Update the tool call part with the result
						await ctx.runMutation(internal.messages.updateToolCallPart, {
							messageId: args.messageId,
							toolCallId: part.toolCallId,
							state: "result",
							result: toolResult,
						});
						break;

					case "tool-call-streaming-start":
						// Add tool call part in "partial-call" state
						if (part.toolCallId && part.toolName) {
							await ctx.runMutation(internal.messages.addToolCallPart, {
								messageId: args.messageId,
								toolCallId: part.toolCallId,
								toolName: part.toolName,
								args: part.args || {},
								state: "partial-call",
							});
						}
						break;

					case "start":
						// Handle generation start event
						break;

					case "start-step":
						// Handle multi-step generation start (step boundary marker)
						break;

					case "finish-step":
						// Handle multi-step generation completion
						// Check if this event contains tool results (fallback for different SDK versions)
						if ((part as any).toolResults) {
							const toolResults = (part as any).toolResults;
							
							// Process each tool result
							for (const toolResult of toolResults) {
								if (toolResult.toolCallId && toolResult.result) {
									await ctx.runMutation(internal.messages.updateToolCallPart, {
										messageId: args.messageId,
										toolCallId: toolResult.toolCallId,
										state: "result",
										result: toolResult.result,
									});
								}
							}
						}
						break;

					case "finish":
						// Handle completion events (provides usage stats, finish reason, etc.)
						break;

					case "error":
						// Handle stream errors explicitly
						console.error("Stream error:", part.error);
						throw new Error(`Stream error: ${part.error}`);

					// Handle other event types that might be added in future SDK versions
					default:
						// Silently ignore unknown event types
						break;
				}
			}

			// Get final usage with optional chaining
			const finalUsage = await result.usage;
			if (finalUsage) {
				await updateUsage(finalUsage);
			}

			// If we have streamed content, mark the message as complete
			if (hasContent) {
				// Format usage data for the message
				const formattedUsage = formatUsageData(finalUsage);

				await ctx.runMutation(internal.messages.completeStreamingMessage, {
					messageId: args.messageId,
					streamId: args.streamId,
					fullText,
					usage: formattedUsage,
				});
			}

			// Clear the generation flag on success
			await ctx.runMutation(internal.messages.clearGenerationFlag, {
				threadId: args.threadId,
			});
		} catch (error) {
			await handleAIResponseError(ctx, error, args.threadId, args.messageId, {
				modelId: args.modelId,
				provider: getProviderFromModelId(args.modelId as ModelId),
			});
		}

		return null;
	},
});

// Internal action to generate AI response using AI SDK v5
export const generateAIResponse = internalAction({
	args: {
		threadId: v.id("threads"),
		userMessage: v.string(),
		modelId: modelIdValidator, // Use validated modelId
		attachments: v.optional(v.array(v.id("files"))),
		webSearchEnabled: v.optional(v.boolean()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		let messageId: Id<"messages"> | null = null;
		try {
			// Get thread and user information
			const thread = await ctx.runQuery(internal.messages.getThreadById, {
				threadId: args.threadId,
			});
			requireResource(thread, "Thread");

			// Derive provider from modelId
			const provider = getProviderFromModelId(args.modelId as ModelId);

			// Get user's API keys if available
			const userApiKeys = await ctx.runMutation(
				internal.userSettings.getDecryptedApiKeys,
				{ userId: thread.userId },
			);

			// Generate unique stream ID and create streaming message
			const streamId = generateStreamId();
			messageId = await createStreamingMessageUtil(
				ctx,
				args.threadId,
				args.modelId as ModelId,
				streamId,
				!!(
					(provider === "anthropic" && userApiKeys?.anthropic) ||
					(provider === "openai" && userApiKeys?.openai) ||
					(provider === "openrouter" && userApiKeys?.openrouter)
				),
			);

			// Build conversation messages using shared utility
			const messages = await buildConversationMessages(
				ctx,
				args.threadId,
				args.modelId as ModelId,
				args.attachments,
				args.webSearchEnabled,
			);

			console.log(
				`Attempting to call ${provider} with model ID ${args.modelId} and ${messages.length} messages`,
			);
			console.log(`Schema fix timestamp: ${Date.now()}`);
			console.log(`Web search enabled: ${args.webSearchEnabled}`);

			// Stream AI response using shared utility
			const { usage: finalUsage } = await streamAIResponse(
				ctx,
				args.modelId as ModelId,
				messages,
				messageId,
				userApiKeys,
				args.webSearchEnabled,
			);

			// Update thread usage using shared utility
			await updateThreadUsageUtil(
				ctx,
				args.threadId,
				args.modelId as ModelId,
				finalUsage,
			);

			// Mark message as complete with usage data
			const formattedUsage = formatUsageData(finalUsage);

			await ctx.runMutation(internal.messages.completeStreamingMessageLegacy, {
				messageId,
				usage: formattedUsage,
			});

			// Clear generation flag using shared utility
			await clearGenerationFlagUtil(ctx, args.threadId);
		} catch (error) {
			const provider = getProviderFromModelId(args.modelId as ModelId);
			console.error(
				`Error generating ${provider} response with model ${args.modelId}:`,
				error,
			);

			await handleAIResponseError(
				ctx,
				error,
				args.threadId,
				messageId || undefined,
				{
					modelId: args.modelId,
					provider,
					useStreamingUpdate: true,
				},
			);
		}

		return null;
	},
});
