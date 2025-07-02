import {
	type ModelMessage,
	type UIMessage,
	convertToModelMessages,
	smoothStream,
	streamText,
} from "ai";
import { stepCountIs } from "ai";
import type { Infer } from "convex/values";
import type { ModelId } from "../src/lib/ai/schemas";
import {
	getModelById,
	getModelConfig,
	getProviderFromModelId,
	isThinkingMode,
} from "../src/lib/ai/schemas";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { createAIClient } from "./lib/ai_client";
import { createWebSearchTool } from "./lib/ai_tools";
import { createSystemPrompt } from "./lib/message_builder";
import { getModelStreamingDelay } from "./lib/streaming_config";
import { handleAIResponseError } from "./messages/helpers";
import type { httpStreamingRequestValidator } from "./validators";

// Types from validators
type HTTPStreamingRequest = Infer<typeof httpStreamingRequestValidator>;

export const corsHandler = httpAction(async (ctx, request) => {
	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Expose-Headers": "X-Thread-Id",
			"Access-Control-Max-Age": "86400",
		},
	});
});

export const streamChatResponse = httpAction(async (ctx, request) => {
	try {
		// Parse and validate request body
		const body = (await request.json()) as HTTPStreamingRequest;

		const { clientId, modelId, messages: uiMessages, options } = body;

		// Handle thread creation for new chats
		let threadId: Id<"threads">;
		let thread: Doc<"threads"> | null;

		if (!clientId) {
			return new Response("Thread ID or client ID required", {
				status: 400,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Expose-Headers": "X-Thread-Id",
				},
			});
		}

		thread = await ctx.runQuery(api.threads.getByClientId, { clientId });
		if (!thread) {
			return new Response("Failed to create thread", {
				status: 500,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Expose-Headers": "X-Thread-Id",
				},
			});
		}

		// Save the latest user message to database
		// The HTTP streaming request is triggered by a new user message, so we only need to save the latest one
		if (uiMessages && uiMessages.length > 0) {
			// Find the latest user message (the one that triggered this request)
			const userMessages = uiMessages.filter((msg) => msg.role === "user");

			if (userMessages.length < 1) {
				throw new Error("No user messages provided");
			}

			const latestUserMessage = userMessages[userMessages.length - 1];

			// Extract text content from the latest user message
			const textParts = latestUserMessage.parts
				.filter((part) => part.type === "text")
				.map((part) => (part as { text: string }).text)
				.join("\n");

			if (textParts.trim()) {
				// Save only the latest user message with parts
				const savedMessageId = await ctx.runMutation(
					internal.messages.createUserMessage,
					{
						threadId: thread._id,
						role: "user",
						parts: {
							type: "text",
							text: textParts,
						},
						modelId: modelId as ModelId,
					},
				);

				// Add the parts from the user message
				// Since user messages are text-only, we just need to add text parts
				await ctx.runMutation(internal.messages.addTextPart, {
					messageId: savedMessageId,
					text: textParts,
				});
			}
		}

		// Get user's API keys
		const userApiKeys = (await ctx.runMutation(
			internal.userSettings.getDecryptedApiKeys,
			{ userId: thread.userId },
		)) as {
			anthropic?: string;
			openai?: string;
			openrouter?: string;
		} | null;

		// Build conversation messages using modern parts-based approach
		if (!uiMessages || uiMessages.length === 0) {
			throw new Error(
				"UIMessages required - legacy thread-based fallback removed",
			);
		}

		// Convert UIMessages to ModelMessages using SDK function
		const convertedMessages = convertToModelMessages(uiMessages as UIMessage[]);

		// Filter out messages with empty content (Anthropic doesn't allow this)
		const validMessages = convertedMessages.filter((msg) => {
			const hasValidContent = Array.isArray(msg.content)
				? msg.content.length > 0
				: msg.content && msg.content.trim().length > 0;

			return hasValidContent;
		});

		// Add system prompt at the beginning
		const systemPrompt = createSystemPrompt(
			modelId as ModelId,
			options?.webSearchEnabled,
		);
		const messages: ModelMessage[] = [
			{
				role: "system",
				content: systemPrompt,
			},
			...validMessages,
		];

		const provider = getProviderFromModelId(modelId as ModelId);
		const model = getModelById(modelId as ModelId);

		// Create AI client
		const ai = createAIClient(modelId as ModelId, userApiKeys || undefined);

		// Track state for database updates
		let pendingText = "";
		let pendingReasoning = "";
		let fullText = "";
		let updateTimer: NodeJS.Timeout | null = null;
		let hasTransitionedToStreaming = false;

		// Helper to update text content
		const updateTextContent = async () => {
			if (!pendingText) return;

			// Add text part to parts array
			await ctx.runMutation(internal.messages.addTextPart, {
				messageId,
				text: pendingText,
			});

			pendingText = "";
		};

		// Helper to update reasoning content
		const updateReasoningContent = async () => {
			if (!pendingReasoning) return;

			// Add reasoning part to parts array
			await ctx.runMutation(internal.messages.addReasoningPart, {
				messageId,
				text: pendingReasoning,
				providerMetadata: undefined,
			});

			pendingReasoning = "";
		};

		// Helper to transition to streaming status on first chunk
		const transitionToStreaming = async () => {
			if (!hasTransitionedToStreaming) {
				await ctx.runMutation(internal.messages.updateMessageStatus, {
					messageId,
					status: "streaming",
				});
				hasTransitionedToStreaming = true;
			}
		};

		// Combined update helper
		const updateDatabase = async () => {
			await Promise.all([updateTextContent(), updateReasoningContent()]);
		};

		// Set up periodic database updates (250ms)
		updateTimer = setInterval(() => {
			updateDatabase().catch(console.error);
		}, 250);

		try {
			// Prepare generation options
			const generationOptions: Parameters<typeof streamText>[0] = {
				model: ai,
				messages,
				temperature: 0.7,
				experimental_transform: smoothStream({
					delayInMs: getModelStreamingDelay(modelId as ModelId),
					chunking: "word",
				}),
				onChunk: async ({ chunk }) => {
					// Handle Vercel AI SDK v5 chunk types
					switch (chunk.type) {
						case "text":
							if (chunk.text) {
								await transitionToStreaming();
								pendingText += chunk.text;
								fullText += chunk.text;
							}
							break;

						case "reasoning":
							if (chunk.text) {
								await transitionToStreaming();
								pendingReasoning += chunk.text;
							}
							break;

						case "source":
							// Add source part to database
							if (chunk.sourceType === "url") {
								await ctx.runMutation(internal.messages.addSourcePart, {
									messageId,
									sourceId: chunk.id || "",
									sourceType: "url",
									title: chunk.title || "",
									url: chunk.url,
									filename: undefined,
									mediaType: undefined,
									providerMetadata: chunk.providerMetadata,
								});
							} else {
								// Document type source
								await ctx.runMutation(internal.messages.addSourcePart, {
									messageId,
									sourceId: chunk.id || "",
									sourceType: "document",
									title: chunk.title || "",
									url: undefined,
									filename: "filename" in chunk ? chunk.filename : undefined,
									mediaType: chunk.mediaType,
									providerMetadata: chunk.providerMetadata,
								});
							}
							break;

						case "raw":
							// Add raw part for unstructured data
							await ctx.runMutation(internal.messages.addRawPart, {
								messageId,
								rawValue: chunk,
							});
							break;

						case "tool-call":
							// Add tool call to database
							await ctx.runMutation(internal.messages.addToolCallPart, {
								messageId,
								toolCallId: chunk.toolCallId,
								toolName: chunk.toolName,
								args: chunk.input || {},
								state: "call",
							});
							break;

						case "tool-result":
							// Update tool call with result
							await ctx.runMutation(internal.messages.updateToolCallPart, {
								messageId,
								toolCallId: chunk.toolCallId,
								result: chunk.output,
								state: "result",
							});
							break;

						case "tool-call-streaming-start":
						case "tool-call-delta":
							// These are intermediate streaming states for tools
							// We handle the complete tool call in the 'tool-call' case
							break;

						default:
							// This should never happen with the known types
							console.warn("Unexpected chunk type", chunk);
					}
				},
				onFinish: async (result) => {
					// Clear timer
					if (updateTimer) {
						clearInterval(updateTimer);
					}

					// Final database update
					await updateDatabase();

					// Extract usage data if available
					let usage = undefined;
					if (result.usage) {
						usage = {
							inputTokens: result.usage.inputTokens || 0,
							outputTokens: result.usage.outputTokens || 0,
							totalTokens: result.usage.totalTokens || 0,
							reasoningTokens: result.usage.reasoningTokens || 0,
							cachedInputTokens: result.usage.cachedInputTokens || 0,
						};
					}

					// Mark message as complete with usage data
					await ctx.runMutation(internal.messages.markComplete, {
						messageId,
						usage,
					});

					// Clear generation flag
					await ctx.runMutation(internal.messages.clearGenerationFlag, {
						threadId,
					});

					console.log(`Streaming completed for message ${messageId}`, {
						fullTextLength: fullText.length,
						usage,
					});
				},
			};

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

			// Stream the text and return UI message stream response
			console.log(
				"[HTTP Streaming] Starting streamText with",
				messages.length,
				"messages",
			);
			const result = streamText(generationOptions);

			// Add thread ID to response headers for new chats
			const responseHeaders: HeadersInit = {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Expose-Headers": "X-Thread-Id",
			};

			// Include thread ID in headers for the client to update its state
			if (!requestThreadId && threadId) {
				responseHeaders["X-Thread-Id"] = threadId;
				console.log(
					"[HTTP Streaming] Including thread ID in response headers:",
					threadId,
				);
			}

			console.log("[HTTP Streaming] Returning UI message stream response");

			// Filter out user messages from the response to prevent duplicates
			// Frontend will handle user messages optimistically
			const filteredUIMessages =
				uiMessages?.filter((msg) => msg.role !== "user") || [];

			console.log("[HTTP Streaming] Filtered UI messages:", {
				originalCount: uiMessages?.length || 0,
				filteredCount: filteredUIMessages.length,
				removedUserMessages:
					(uiMessages?.length || 0) - filteredUIMessages.length,
			});

			return result.toUIMessageStreamResponse({
				headers: responseHeaders,
				originalMessages: filteredUIMessages as UIMessage[],
			});
		} catch (error) {
			// Clean up timer on error
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			console.error("Streaming error:", error);

			await handleAIResponseError(ctx, error, threadId, messageId, {
				modelId: modelId as ModelId,
				provider: getProviderFromModelId(modelId as ModelId),
				useStreamingUpdate: true,
			});

			throw error;
		}
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
