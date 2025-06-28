import {
	type CoreMessage,
	type TextStreamPart,
	type ToolSet,
	smoothStream,
	stepCountIs,
	streamText,
} from "ai";
import type { FunctionReturnType } from "convex/server";
import type { Infer } from "convex/values";
import {
	type ModelId,
	getModelById,
	getModelConfig,
	getProviderFromModelId,
	isThinkingMode,
} from "../src/lib/ai/schemas";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { createAIClient } from "./lib/ai_client";
import { createWebSearchTool } from "./lib/ai_tools";
import { createSystemPrompt } from "./lib/message_builder";
import { getModelStreamingDelay } from "./lib/streaming_config";
import { handleAIResponseError } from "./messages/helpers";
import { formatUsageData } from "./messages/types";
import type {
	MessagePart,
	StreamEnvelope,
	httpStreamingRequestValidator,
} from "./validators";

// Types from validators
type StreamWithChunks = NonNullable<
	FunctionReturnType<typeof internal.streams.getStreamWithChunks>
>;
type HTTPStreamingRequest = Infer<typeof httpStreamingRequestValidator>;

// Helper function to determine when to update database
function hasDelimiter(text: string): boolean {
	return (
		text.includes("\n") ||
		text.includes(".") ||
		text.includes("?") ||
		text.includes("!") ||
		text.includes(",") ||
		text.length > 100
	);
}

// Helper function to build conversation messages
async function buildConversationMessages(
	ctx: { runQuery: any; runMutation: any },
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

// Helper to convert database chunks to message parts
function chunkToMessagePart(
	chunk: StreamWithChunks["chunks"][0],
): MessagePart | null {
	if (chunk.type === "text" || !chunk.type) {
		return {
			type: "text",
			text: chunk.text,
		};
	}

	if (chunk.type === "tool_call") {
		return {
			type: "tool-call",
			toolCallId: chunk.metadata?.toolCallId || "unknown",
			toolName: chunk.metadata?.toolName || "unknown",
			args: JSON.parse(chunk.text),
			state: "call",
		};
	}

	if (chunk.type === "tool_result") {
		return {
			type: "tool-call",
			toolCallId: chunk.metadata?.toolCallId || "unknown",
			toolName: chunk.metadata?.toolName || "unknown",
			result: JSON.parse(chunk.text),
			state: "result",
		};
	}

	if (chunk.type === "reasoning") {
		return {
			type: "reasoning",
			text: chunk.text,
		};
	}

	if (chunk.type === "error") {
		return {
			type: "error",
			errorMessage: chunk.text,
		};
	}

	return null;
}

export const streamChatResponse = httpAction(async (ctx, request) => {
	console.log("HTTP Streaming endpoint called");

	// Handle CORS preflight
	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Max-Age": "86400",
			},
		});
	}

	try {
		// Get authentication from header
		const authHeader = request.headers.get("Authorization");
		console.log("Auth header present:", !!authHeader);

		// Parse request body with type
		const body = (await request.json()) as HTTPStreamingRequest;
		const { threadId, modelId, messages, options } = body;

		console.log("HTTP Streaming request:", {
			threadId,
			modelId,
			messageCount: messages?.length,
			useExistingMessage: options?.useExistingMessage,
			resumeFromStreamId: options?.resumeFromStreamId,
		});

		// Verify thread exists and user has access
		const thread = await ctx.runQuery(api.threads.get, { threadId });
		if (!thread) {
			return new Response("Thread not found", { status: 404 });
		}

		let streamId: Id<"streams">;
		let messageId: Id<"messages">;

		// Use existing stream and message for hybrid streaming, or create new ones
		if (options?.resumeFromStreamId && options?.useExistingMessage) {
			// Hybrid streaming mode - use existing structures
			streamId = options.resumeFromStreamId;
			messageId = options.useExistingMessage;

			console.log("Using existing stream and message for hybrid streaming:", {
				streamId,
				messageId,
			});
		} else {
			// Regular HTTP streaming mode - create new structures
			streamId = await ctx.runMutation(internal.streams.create, {
				userId: thread.userId,
				metadata: { threadId, modelId },
			});

			messageId = await ctx.runMutation(internal.messages.create, {
				threadId,
				messageType: "assistant",
				body: "",
				modelId: modelId as ModelId,
				isStreaming: true,
				streamId,
			});

			console.log("Created new stream and message:", {
				streamId,
				messageId,
			});
		}

		// For hybrid streaming, we handle AI generation directly in the HTTP endpoint
		// This ensures single AI generation with dual writing (HTTP + database)

		// Get user's API keys for AI generation
		const userApiKeys = (await ctx.runMutation(
			internal.userSettings.getDecryptedApiKeys,
			{ userId: thread.userId },
		)) as {
			anthropic?: string;
			openai?: string;
			openrouter?: string;
		} | null;

		// Create TransformStream for better control
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();

		// Start async streaming
		const streamData = async () => {
			let fullText = "";
			let pendingText = "";
			let pendingReasoning = "";
			let sequence = 0;

			try {
				// Send stream start event
				await writer.write(
					encoder.encode(
						JSON.stringify({
							type: "content",
							envelope: {
								streamId,
								messageId,
								sequence: sequence++,
								timestamp: Date.now(),
								event: {
									type: "stream-start",
									metadata: { modelId },
								},
							},
						}) + "\n",
					),
				);

				// Build messages and create AI client
				const messages = await buildConversationMessages(
					ctx,
					threadId,
					modelId as ModelId,
					options?.webSearchEnabled,
				);

				const ai = createAIClient(modelId as ModelId, userApiKeys || undefined);
				const model = getModelById(modelId as ModelId);
				const provider = getProviderFromModelId(modelId as ModelId);

				console.log(
					`AI SDK v5: Starting inline streaming with ${provider} model ${model.id}, messages: ${messages.length}`,
				);

				// Prepare generation options
				const generationOptions: Parameters<typeof streamText>[0] = {
					model: ai,
					messages,
					temperature: 0.7,
					experimental_transform: smoothStream({
						delayInMs: getModelStreamingDelay(modelId as ModelId),
						chunking: "word",
					}),
				};

				// Add thinking mode configuration
				if (provider === "anthropic" && isThinkingMode(modelId as ModelId)) {
					const modelConfig = getModelConfig(modelId as ModelId);
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

				// Add tools if supported
				if (model.features.functionCalling && options?.webSearchEnabled) {
					generationOptions.tools = {
						web_search: createWebSearchTool(),
					};
					generationOptions.stopWhen = stepCountIs(5);
				}

				// Stream text from AI
				const result = streamText(generationOptions);

				// Process stream
				for await (const streamPart of result.fullStream) {
					const part: TextStreamPart<ToolSet> = streamPart;

					switch (part.type) {
						case "text":
							if (part.text) {
								// Send to client immediately
								await writer.write(
									encoder.encode(
										JSON.stringify({
											type: "content",
											envelope: {
												streamId,
												messageId,
												sequence: sequence++,
												timestamp: Date.now(),
												part: {
													type: "text",
													text: part.text,
												},
											},
										}) + "\n",
									),
								);

								// Accumulate for DB
								fullText += part.text;
								pendingText += part.text;

								// Update DB periodically
								if (hasDelimiter(pendingText)) {
									await ctx.runMutation(
										internal.messages.updateStreamingMessage,
										{
											messageId,
											content: fullText,
										},
									);

									await ctx.runMutation(internal.messages.addTextPart, {
										messageId,
										text: pendingText,
									});

									await ctx.runMutation(internal.streamDeltas.addDelta, {
										messageId,
										streamId,
										sequence: sequence - 1,
										text: pendingText,
										timestamp: Date.now(),
										partType: "text",
									});

									pendingText = "";
								}
							}
							break;

						case "reasoning":
							if (part.text) {
								// Send to client immediately
								await writer.write(
									encoder.encode(
										JSON.stringify({
											type: "content",
											envelope: {
												streamId,
												messageId,
												sequence: sequence++,
												timestamp: Date.now(),
												part: {
													type: "reasoning",
													text: part.text,
												},
											},
										}) + "\n",
									),
								);

								// Accumulate for DB
								pendingReasoning += part.text;

								if (pendingReasoning.length > 100) {
									await ctx.runMutation(internal.messages.addReasoningPart, {
										messageId,
										text: pendingReasoning,
										providerMetadata: undefined,
									});

									await ctx.runMutation(internal.streamDeltas.addDelta, {
										messageId,
										streamId,
										sequence: sequence - 1,
										text: pendingReasoning,
										timestamp: Date.now(),
										partType: "reasoning",
									});

									pendingReasoning = "";
								}
							}
							break;

						case "tool-call":
							await writer.write(
								encoder.encode(
									JSON.stringify({
										type: "content",
										envelope: {
											streamId,
											messageId,
											sequence: sequence++,
											timestamp: Date.now(),
											part: {
												type: "tool-call",
												toolCallId: part.toolCallId,
												toolName: part.toolName,
												args: part.input,
												state: "call",
											},
										},
									}) + "\n",
								),
							);

							await ctx.runMutation(internal.messages.addToolCallPart, {
								messageId,
								toolCallId: part.toolCallId,
								toolName: part.toolName,
								args: part.input,
								state: "call",
							});

							await ctx.runMutation(internal.streamDeltas.addDelta, {
								messageId,
								streamId,
								sequence: sequence - 1,
								text: JSON.stringify({
									toolCallId: part.toolCallId,
									toolName: part.toolName,
									args: part.input,
								}),
								timestamp: Date.now(),
								partType: "tool-call",
								metadata: {
									toolCallId: part.toolCallId,
									toolName: part.toolName,
									args: part.input,
									state: "call",
								},
							});
							break;

						case "tool-result":
							await writer.write(
								encoder.encode(
									JSON.stringify({
										type: "content",
										envelope: {
											streamId,
											messageId,
											sequence: sequence++,
											timestamp: Date.now(),
											part: {
												type: "tool-call",
												toolCallId: part.toolCallId,
												toolName: part.toolName,
												result: part.output,
												state: "result",
											},
										},
									}) + "\n",
								),
							);

							await ctx.runMutation(internal.messages.updateToolCallPart, {
								messageId,
								toolCallId: part.toolCallId,
								result: part.output,
								state: "result",
							});

							await ctx.runMutation(internal.streamDeltas.addDelta, {
								messageId,
								streamId,
								sequence: sequence - 1,
								text: JSON.stringify({
									toolCallId: part.toolCallId,
									toolName: part.toolName,
									result: part.output,
								}),
								timestamp: Date.now(),
								partType: "tool_result",
								metadata: {
									toolCallId: part.toolCallId,
									toolName: part.toolName,
									result: part.output,
									state: "result",
								},
							});
							break;

						case "error":
							const errorMessage =
								part.error instanceof Error
									? part.error.message
									: String(part.error || "Unknown stream error");
							throw new Error(errorMessage);

						case "start":
						case "start-step":
							// AI SDK generation events - no action needed
							break;

						default:
							console.warn(
								"Unhandled stream part type:",
								(part as { type: string }).type,
							);
							break;
					}
				}

				// Flush any remaining content
				if (pendingText) {
					await ctx.runMutation(internal.messages.addTextPart, {
						messageId,
						text: pendingText,
					});

					await ctx.runMutation(internal.streamDeltas.addDelta, {
						messageId,
						streamId,
						sequence: sequence++,
						text: pendingText,
						timestamp: Date.now(),
						partType: "text",
					});
				}

				if (pendingReasoning) {
					await ctx.runMutation(internal.messages.addReasoningPart, {
						messageId,
						text: pendingReasoning,
						providerMetadata: undefined,
					});

					await ctx.runMutation(internal.streamDeltas.addDelta, {
						messageId,
						streamId,
						sequence: sequence++,
						text: pendingReasoning,
						timestamp: Date.now(),
						partType: "reasoning",
					});
				}

				// Complete the message
				const usage = await result.usage;
				if (usage) {
					const formattedUsage = formatUsageData(usage);
					await ctx.runMutation(internal.messages.completeStreamingMessage, {
						messageId,
						streamId,
						fullText,
						usage: formattedUsage,
					});
				} else if (fullText.length > 0) {
					await ctx.runMutation(internal.messages.completeStreamingMessage, {
						messageId,
						streamId,
						fullText,
						usage: undefined,
					});
				}

				// Mark stream as complete
				await ctx.runMutation(internal.streams.markComplete, {
					streamId,
				});

				// Send completion event
				await writer.write(
					encoder.encode(
						JSON.stringify({
							type: "content",
							envelope: {
								streamId,
								messageId,
								sequence: sequence++,
								timestamp: Date.now(),
								event: {
									type: "stream-end",
									metadata: {},
								},
							},
						}) + "\n",
					),
				);
			} catch (error) {
				console.error("Streaming error:", error);

				const errorMsg =
					error instanceof Error ? error.message : "Unknown error";

				// Send error to client
				await writer.write(
					encoder.encode(
						JSON.stringify({
							type: "content",
							envelope: {
								streamId,
								messageId,
								sequence: sequence++,
								timestamp: Date.now(),
								event: {
									type: "stream-error",
									error: errorMsg,
									code: "generation_error",
								},
							},
						}) + "\n",
					),
				);

				// Update message with error
				await handleAIResponseError(ctx, error, threadId, messageId, {
					modelId: modelId as ModelId,
					provider: getProviderFromModelId(modelId as ModelId),
					useStreamingUpdate: true,
				});

				// Mark stream as error
				await ctx.runMutation(internal.streams.markError, {
					streamId,
					error: errorMsg,
				});
			} finally {
				// Always cleanup
				await writer.close();

				// Clear generation flag
				await ctx.runMutation(internal.messages.clearGenerationFlag, {
					threadId,
				});
			}
		};

		// Start streaming in background
		void streamData();

		return new Response(readable, {
			headers: {
				"Content-Type": "application/x-ndjson",
				"Transfer-Encoding": "chunked",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Cache-Control": "no-cache",
			},
		});
	} catch (error) {
		console.error("HTTP streaming setup error:", error);

		return new Response(
			JSON.stringify({ error: "Failed to start streaming" }),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			},
		);
	}
});

// HTTP endpoint for continuing a stream (used by useStream hook)
export const streamContinue = httpAction(async (ctx, request) => {
	console.log("Stream continue endpoint called");

	// Handle CORS preflight
	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Max-Age": "86400",
			},
		});
	}

	try {
		// Extract streamId from URL path
		const url = new URL(request.url);
		const pathMatch = url.pathname.match(/\/stream-continue\/(.+)$/);
		const streamId = pathMatch ? pathMatch[1] : null;

		if (!streamId) {
			return new Response("Stream ID required", { status: 400 });
		}

		console.log("Continuing stream:", streamId);

		// Get stream data
		const streamData: StreamWithChunks | null = await ctx.runQuery(
			internal.streams.getStreamWithChunks,
			{
				streamId: streamId as Id<"streams">,
			},
		);

		if (!streamData) {
			return new Response("Stream not found", { status: 404 });
		}

		// Create HTTP streaming response that sends existing chunks
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();

				// Send all existing chunks immediately using new envelope format
				streamData.chunks.forEach((chunk, index) => {
					const part = chunkToMessagePart(chunk);
					if (part) {
						const envelope: StreamEnvelope = {
							streamId: streamData.stream._id,
							messageId: streamData.stream.messageId as Id<"messages">,
							sequence: index,
							timestamp: chunk.createdAt || chunk._creationTime,
							part,
						};

						const streamChunk = {
							type: "content",
							envelope,
						};

						controller.enqueue(
							encoder.encode(`${JSON.stringify(streamChunk)}\n`),
						);
					}
				});

				// Send completion or error if stream is done
				if (streamData.stream.status === "done") {
					const endEnvelope: StreamEnvelope = {
						streamId: streamData.stream._id,
						messageId: streamData.stream.messageId as Id<"messages">,
						sequence: streamData.chunks.length,
						timestamp: Date.now(),
						event: {
							type: "stream-end",
							metadata: {},
						},
					};
					const endChunk = {
						type: "content",
						envelope: endEnvelope,
					};
					controller.enqueue(encoder.encode(`${JSON.stringify(endChunk)}\n`));
				} else if (streamData.stream.status === "error") {
					const errorEnvelope: StreamEnvelope = {
						streamId: streamData.stream._id,
						messageId: streamData.stream.messageId as Id<"messages">,
						sequence: streamData.chunks.length,
						timestamp: Date.now(),
						event: {
							type: "stream-error",
							error: streamData.stream.error || "Stream error",
							code: "stream_error",
						},
					};
					const errorChunk = {
						type: "content",
						envelope: errorEnvelope,
					};
					controller.enqueue(encoder.encode(`${JSON.stringify(errorChunk)}\n`));
				}

				// Close the stream
				controller.close();
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "application/x-ndjson",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		console.error("Stream continue error:", error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Internal server error",
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			},
		);
	}
});
