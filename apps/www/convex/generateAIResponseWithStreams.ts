import {
	type CoreMessage,
	type TextStreamPart,
	type ToolSet,
	streamText,
} from "ai";
import { stepCountIs } from "ai";
import { v } from "convex/values";
import {
	type ModelId,
	getModelById,
	getProviderFromModelId,
} from "../src/lib/ai/schemas";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, internalAction } from "./_generated/server";
import { createAIClient } from "./lib/ai_client";
import { createWebSearchTool } from "./lib/ai_tools";
import { createSystemPrompt } from "./lib/message_builder";
import { handleAIResponseError } from "./messages/helpers";
import { formatUsageData } from "./messages/types";
import { modelIdValidator } from "./validators";
import { getWriter } from "./hybridStreamWriter";

// Helper function to build conversation messages for stream-based AI responses
async function buildConversationMessagesForStreams(
	ctx: ActionCtx,
	threadId: Id<"threads">,
	modelId: ModelId,
	webSearchEnabled?: boolean,
): Promise<CoreMessage[]> {
	// Get recent conversation context
	const recentMessages: Array<{
		body: string;
		messageType: "user" | "assistant" | "system";
		attachments?: Id<"files">[];
	}> = await ctx.runQuery(internal.messages.getRecentContext, { threadId });

	const provider = getProviderFromModelId(modelId);
	const systemPrompt = createSystemPrompt(modelId, webSearchEnabled);

	// Prepare messages for AI SDK v5 with multimodal support
	const messages: CoreMessage[] = [
		{
			role: "system",
			content: systemPrompt,
		},
	];

	// Build conversation history with attachments
	for (const msg of recentMessages) {
		// Skip system messages as we already have system prompt
		if (msg.messageType === "system") continue;

		// Build message content with attachments using mutation
		const content = await ctx.runMutation(
			internal.messages.buildMessageContent,
			{
				text: msg.body,
				attachmentIds: msg.attachments,
				provider,
				modelId,
			},
		);

		if (msg.messageType === "user") {
			messages.push({
				role: "user",
				content,
			});
		} else if (msg.messageType === "assistant") {
			// Assistant messages should only have text content
			const textContent = typeof content === "string" ? content : msg.body;
			messages.push({
				role: "assistant",
				content: textContent,
			});
		}
	}

	return messages;
}

// New action that uses the stream system for all AI responses
export const generateAIResponseWithStreams = internalAction({
	args: {
		threadId: v.id("threads"),
		messageId: v.id("messages"),
		streamId: v.id("streams"),
		modelId: modelIdValidator,
		userApiKeys: v.optional(
			v.object({
				anthropic: v.optional(v.string()),
				openai: v.optional(v.string()),
				openrouter: v.optional(v.string()),
			}),
		),
		webSearchEnabled: v.optional(v.boolean()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		// Look up active HTTP writer for this stream
		const hybridWriter = getWriter(args.streamId);
		try {
			const provider = getProviderFromModelId(args.modelId as ModelId);
			const model = getModelById(args.modelId as ModelId);

			// Build conversation messages from the thread
			const messages = await buildConversationMessagesForStreams(
				ctx,
				args.threadId,
				args.modelId as ModelId,
				args.webSearchEnabled,
			);

			console.log(
				`AI SDK v5: Starting streaming with ${provider} model ${model.id}, messages: ${messages.length}`,
			);

			// Create AI client with proper API keys
			const aiClient = createAIClient(
				args.modelId as ModelId,
				args.userApiKeys,
			);

			// Prepare generation options
			const generationOptions: Parameters<typeof streamText>[0] = {
				model: aiClient,
				messages,
				temperature: 0.7, // Default temperature
			};

			// Add tools if supported and enabled
			if (model.features.functionCalling && args.webSearchEnabled) {
				generationOptions.tools = {
					web_search: createWebSearchTool(),
				};
				// Enable iterative tool calling with stopWhen
				generationOptions.stopWhen = stepCountIs(5); // Allow up to 5 iterations
			}

			// Use the AI SDK v5 streamText
			const result = streamText(generationOptions);

			let fullText = "";
			let textBuffer = "";
			let pendingBuffer = "";
			const SENTENCE_DELIMITERS = /[.!?\n]/;

			const flushTextBuffer = async (force = false) => {
				const toFlush = force ? textBuffer + pendingBuffer : textBuffer;

				if (toFlush.length > 0) {
					// Use HybridStreamWriter if available, otherwise fallback to old system
					if (hybridWriter) {
						await hybridWriter.writeTextChunk(toFlush);
					} else {
						await ctx.runMutation(internal.streams.addTextChunk, {
							streamId: args.streamId,
							text: toFlush,
						});
					}
					fullText += toFlush;

					textBuffer = "";
					if (force) {
						pendingBuffer = "";
					}
				}
			};

			// Use fullStream as the unified interface (works with or without tools)
			for await (const streamPart of result.fullStream) {
				// Use the official AI SDK TextStreamPart type
				const part: TextStreamPart<ToolSet> = streamPart;
				switch (part.type) {
					case "text":
						// Handle text with sentence batching
						if (part.text) {
							pendingBuffer += part.text;

							// Look for sentence boundaries
							let lastDelimiterIndex = -1;
							for (let i = 0; i < pendingBuffer.length; i++) {
								if (SENTENCE_DELIMITERS.test(pendingBuffer[i])) {
									lastDelimiterIndex = i;
								}
							}

							// If we found a sentence boundary, move complete sentences to textBuffer
							if (lastDelimiterIndex !== -1) {
								textBuffer += pendingBuffer.substring(
									0,
									lastDelimiterIndex + 1,
								);
								pendingBuffer = pendingBuffer.substring(lastDelimiterIndex + 1);
								await flushTextBuffer();
							}

							// Force flush if buffer is too large
							if (pendingBuffer.length >= 200) {
								textBuffer = pendingBuffer;
								pendingBuffer = "";
								await flushTextBuffer(true);
							}
						}
						break;

					case "reasoning":
						// Flush any pending text first
						await flushTextBuffer(true);

						// Handle Claude thinking/reasoning content
						if (part.type === "reasoning" && part.text) {
							if (hybridWriter) {
								await hybridWriter.writeReasoning(part.text);
							} else {
								await ctx.runMutation(internal.streams.addReasoningChunk, {
									streamId: args.streamId,
									text: part.text,
									providerMetadata: part.providerMetadata,
								});
							}
						}
						break;

					case "reasoning-part-finish":
						// Mark reasoning section as complete
						await ctx.runMutation(internal.streams.addControlChunk, {
							streamId: args.streamId,
							controlType: "reasoning-part-finish",
						});
						break;

					case "tool-call":
						// Flush any pending text first
						await flushTextBuffer(true);

						// Add tool call to stream
						if (hybridWriter) {
							await hybridWriter.writeToolCall({
								toolCallId: part.toolCallId,
								toolName: part.toolName,
								args: part.input,
								state: "call",
							});
						} else {
							await ctx.runMutation(internal.streams.addToolCallChunk, {
								streamId: args.streamId,
								toolCallId: part.toolCallId,
								toolName: part.toolName,
								args: part.input,
								state: "call",
							});
						}
						break;

					case "tool-call-delta":
						// Update tool call with streaming arguments
						if (
							part.type === "tool-call-delta" &&
							part.toolCallId &&
							part.inputTextDelta
						) {
							if (hybridWriter) {
								await hybridWriter.writeToolCall({
									toolCallId: part.toolCallId,
									toolName: part.toolName || "",
									args: part.inputTextDelta,
									state: "partial-call",
								});
							} else {
								await ctx.runMutation(internal.streams.addToolCallChunk, {
									streamId: args.streamId,
									toolCallId: part.toolCallId,
									toolName: part.toolName || "",
									args: part.inputTextDelta,
									state: "partial-call",
								});
							}
						}
						break;

					case "tool-call-streaming-start":
						// Add tool call part in "partial-call" state
						if (
							part.type === "tool-call-streaming-start" &&
							part.toolCallId &&
							part.toolName
						) {
							if (hybridWriter) {
								await hybridWriter.writeToolCall({
									toolCallId: part.toolCallId,
									toolName: part.toolName,
									args: {},
									state: "partial-call",
								});
							} else {
								await ctx.runMutation(internal.streams.addToolCallChunk, {
									streamId: args.streamId,
									toolCallId: part.toolCallId,
									toolName: part.toolName,
									args: {},
									state: "partial-call",
								});
							}
						}
						break;

					case "tool-result": {
						// The AI SDK uses 'output' field for tool results, not 'result'
						const toolResult = part.output;

						// Add tool result to stream
						if (hybridWriter) {
							await hybridWriter.writeToolCall({
								toolCallId: part.toolCallId,
								toolName: part.toolName,
								result: toolResult,
								state: "result",
							});
						} else {
							await ctx.runMutation(internal.streams.addToolResultChunk, {
								streamId: args.streamId,
								toolCallId: part.toolCallId,
								toolName: part.toolName,
								result: toolResult,
							});
						}
						break;
					}

					case "start":
						// Handle generation start event
						await ctx.runMutation(internal.streams.addControlChunk, {
							streamId: args.streamId,
							controlType: "start",
						});
						break;

					case "finish":
						// Flush any remaining text
						await flushTextBuffer(true);

						// Handle generation completion event
						if (part.type === "finish") {
							await ctx.runMutation(internal.streams.addControlChunk, {
								streamId: args.streamId,
								controlType: "finish",
								finishReason: part.finishReason,
								totalUsage: part.totalUsage,
							});
						}
						break;

					case "error":
						// Handle stream errors explicitly
						if (part.type === "error") {
							const errorMessage =
								part.error instanceof Error
									? part.error.message
									: String(part.error || "Unknown stream error");
							console.error("Stream error:", errorMessage);

							// Write error via HybridStreamWriter or fallback to old system
							if (hybridWriter) {
								await hybridWriter.writeError(errorMessage, {
									error: part.error,
									timestamp: Date.now(),
								});
							} else {
								// Mark stream as errored
								await ctx.runMutation(internal.streams.markError, {
									streamId: args.streamId,
									error: errorMessage,
								});
							}

							throw new Error(`Stream error: ${errorMessage}`);
						}
						break;

					// Handle unknown part types
					default: {
						// Log unhandled part types for debugging
						console.warn(
							"Unhandled stream part type:",
							(part as { type: string }).type,
							part,
						);
						break;
					}
				}
			}

			// Get final usage with optional chaining
			const finalUsage = await result.usage;
			if (finalUsage) {
				// Format usage data for the message
				const formattedUsage = formatUsageData(finalUsage);

				await ctx.runMutation(internal.messages.completeStreamingMessage, {
					messageId: args.messageId,
					streamId: args.streamId,
					fullText,
					usage: formattedUsage,
				});
			} else if (fullText.length > 0) {
				// Even without usage data, mark as complete if we have content
				await ctx.runMutation(internal.messages.completeStreamingMessage, {
					messageId: args.messageId,
					streamId: args.streamId,
					fullText,
					usage: undefined,
				});
			}

			// Complete the stream - use HybridStreamWriter if available
			if (hybridWriter) {
				await hybridWriter.finish();
			} else {
				// Mark stream as complete using old system
				await ctx.runMutation(internal.streams.markComplete, {
					streamId: args.streamId,
				});
			}

			// Clear generation flag
			await ctx.runMutation(internal.messages.clearGenerationFlag, {
				threadId: args.threadId,
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			
			// Handle error - use HybridStreamWriter if available
			if (hybridWriter) {
				await hybridWriter.handleError(errorMessage, "generation_error");
			} else {
				// Mark stream as errored using old system
				await ctx.runMutation(internal.streams.markError, {
					streamId: args.streamId,
					error: errorMessage,
				});
			}

			await handleAIResponseError(ctx, error, args.threadId, args.messageId, {
				modelId: args.modelId,
				provider: getProviderFromModelId(args.modelId as ModelId),
				useStreamingUpdate: true,
			});
		}

		return null;
	},
});
