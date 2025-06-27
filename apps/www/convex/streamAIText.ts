import {
	type CoreMessage,
	type TextStreamPart,
	type ToolSet,
	smoothStream,
	streamText,
} from "ai";
import { stepCountIs } from "ai";
import {
	type ModelId,
	getModelById,
	getModelConfig,
	getProviderFromModelId,
	isThinkingMode,
} from "../src/lib/ai/schemas";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import type { HybridStreamWriter } from "./hybridStreamWriter";
import { createAIClient } from "./lib/ai_client";
import { createWebSearchTool } from "./lib/ai_tools";
import { createSystemPrompt } from "./lib/message_builder";
import { getModelStreamingDelay } from "./lib/streaming_config";
import { handleAIResponseError } from "./messages/helpers";
import { formatUsageData } from "./messages/types";

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

// Inline AI generation function that works with HybridStreamWriter directly
export async function streamAIText(
	ctx: ActionCtx,
	args: {
		threadId: Id<"threads">;
		messageId: Id<"messages">;
		streamId: Id<"streams">;
		modelId: ModelId;
		hybridWriter: HybridStreamWriter;
		userApiKeys?: {
			anthropic?: string;
			openai?: string;
			openrouter?: string;
		};
		webSearchEnabled?: boolean;
	},
): Promise<void> {
	const { hybridWriter } = args;

	try {
		const provider = getProviderFromModelId(args.modelId);
		const model = getModelById(args.modelId);

		// Build conversation messages from the thread
		const messages = await buildConversationMessagesForStreams(
			ctx,
			args.threadId,
			args.modelId,
			args.webSearchEnabled,
		);

		console.log(
			`AI SDK v5: Starting inline streaming with ${provider} model ${model.id}, messages: ${messages.length}`,
		);

		// Create AI client with proper API keys
		const ai = createAIClient(args.modelId, args.userApiKeys);

		// Prepare generation options
		const generationOptions: Parameters<typeof streamText>[0] = {
			model: ai,
			messages,
			temperature: 0.7,
			experimental_transform: smoothStream({
				delayInMs: getModelStreamingDelay(args.modelId),
				chunking: "word", // Stream word by word
			}),
		};

		if (provider === "anthropic" && isThinkingMode(args.modelId as ModelId)) {
			const modelConfig = getModelConfig(args.modelId as ModelId);
			if (modelConfig.thinkingConfig) {
				// Add thinking configuration for Anthropic models
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

		// Add tools if supported and enabled
		if (model.features.functionCalling && args.webSearchEnabled) {
			generationOptions.tools = {
				web_search: createWebSearchTool(),
			};
			generationOptions.stopWhen = stepCountIs(5);
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
				// Use HybridStreamWriter directly
				await hybridWriter.writeTextChunk(toFlush);
				fullText += toFlush;

				textBuffer = "";
				if (force) {
					pendingBuffer = "";
				}
			}
		};

		// Process the AI stream
		for await (const streamPart of result.fullStream) {
			const part: TextStreamPart<ToolSet> = streamPart;

			switch (part.type) {
				case "text":
					if (part.text) {
						pendingBuffer += part.text;

						let lastDelimiterIndex = -1;
						for (let i = 0; i < pendingBuffer.length; i++) {
							if (SENTENCE_DELIMITERS.test(pendingBuffer[i])) {
								lastDelimiterIndex = i;
							}
						}

						if (lastDelimiterIndex !== -1) {
							textBuffer += pendingBuffer.substring(0, lastDelimiterIndex + 1);
							pendingBuffer = pendingBuffer.substring(lastDelimiterIndex + 1);
							await flushTextBuffer();
						}

						if (pendingBuffer.length >= 200) {
							textBuffer = pendingBuffer;
							pendingBuffer = "";
							await flushTextBuffer(true);
						}
					}
					break;

				case "reasoning":
					await flushTextBuffer(true);
					if (part.type === "reasoning" && part.text) {
						await hybridWriter.writeReasoning(part.text);
					}
					break;

				case "tool-call":
					await flushTextBuffer(true);
					await hybridWriter.writeToolCall({
						toolCallId: part.toolCallId,
						toolName: part.toolName,
						args: part.input,
						state: "call",
					});
					break;

				case "tool-call-delta":
					if (part.toolCallId && part.inputTextDelta) {
						await hybridWriter.writeToolCall({
							toolCallId: part.toolCallId,
							toolName: part.toolName || "",
							args: part.inputTextDelta,
							state: "partial-call",
						});
					}
					break;

				case "tool-call-streaming-start":
					if (part.toolCallId && part.toolName) {
						await hybridWriter.writeToolCall({
							toolCallId: part.toolCallId,
							toolName: part.toolName,
							args: {},
							state: "partial-call",
						});
					}
					break;

				case "tool-result":
					const toolResult = part.output;
					await hybridWriter.writeToolCall({
						toolCallId: part.toolCallId,
						toolName: part.toolName,
						result: toolResult,
						state: "result",
					});
					break;

				case "error":
					const errorMessage =
						part.error instanceof Error
							? part.error.message
							: String(part.error || "Unknown stream error");
					console.error("Stream error:", errorMessage);
					await hybridWriter.writeError(errorMessage, {
						error: part.error,
						timestamp: Date.now(),
					});
					throw new Error(`Stream error: ${errorMessage}`);

				case "start":
					// AI SDK generation start event - no action needed
					break;

				case "start-step":
					// AI SDK step start event - no action needed
					break;

				default:
					console.warn(
						"Unhandled stream part type:",
						(part as { type: string }).type,
					);
					break;
			}
		}

		// Flush any remaining text
		await flushTextBuffer(true);

		// Get final usage and complete the message
		const finalUsage = await result.usage;
		if (finalUsage) {
			const formattedUsage = formatUsageData(finalUsage);
			await ctx.runMutation(internal.messages.completeStreamingMessage, {
				messageId: args.messageId,
				streamId: args.streamId,
				fullText,
				usage: formattedUsage,
			});
		} else if (fullText.length > 0) {
			await ctx.runMutation(internal.messages.completeStreamingMessage, {
				messageId: args.messageId,
				streamId: args.streamId,
				fullText,
				usage: undefined,
			});
		}

		// Complete the stream via HybridStreamWriter
		await hybridWriter.finish();

		// Clear generation flag
		await ctx.runMutation(internal.messages.clearGenerationFlag, {
			threadId: args.threadId,
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		// Handle error via HybridStreamWriter
		await hybridWriter.handleError(errorMessage, "generation_error");

		await handleAIResponseError(ctx, error, args.threadId, args.messageId, {
			modelId: args.modelId,
			provider: getProviderFromModelId(args.modelId),
			useStreamingUpdate: true,
		});
	}
}
