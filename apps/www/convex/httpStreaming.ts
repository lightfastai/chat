/**
 * HTTP Streaming Handler for AI Chat Responses
 *
 * This handler receives requests from the frontend after user messages are
 * created optimistically. It's responsible for:
 * 1. Creating an assistant message placeholder
 * 2. Streaming AI responses and updating the message
 * 3. Handling errors and updating message status
 *
 * User messages are NOT created here - they're handled optimistically by the frontend
 */

import {
  type ModelMessage,
  type ReasoningUIPart,
  type TextUIPart,
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
  getModelStreamingDelay,
  getProviderFromModelId,
  isThinkingMode,
} from "../src/lib/ai/schemas";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { createAIClient } from "./lib/ai_client";
import { createWebSearchTool } from "./lib/ai_tools";
import { getAuthenticatedUserId } from "./lib/auth";
import { createSystemPrompt } from "./lib/create_system_prompt";
import {
  StreamingReasoningWriter,
  StreamingTextWriter,
} from "./lib/streaming_writers";
import { handleAIResponseError } from "./messages/helpers";
import type { DbMessage, DbMessagePart } from "./types";
import type { modelIdValidator } from "./validators";

interface HTTPStreamingRequest {
	id: Id<"messages">;
	threadClientId: string;
	userMessageId: Id<"messages">;
	messages: DbMessagePart[];
	options: {
		attachments: Id<"files">[];
		webSearchEnabled: boolean;
		modelId: Infer<typeof modelIdValidator>;
	};
}

// Helper function for CORS headers
function corsHeaders(): HeadersInit {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};
}

// CORS preflight handler
export const corsHandler = httpAction(async () => {
	return new Response(null, {
		status: 200,
		headers: corsHeaders(),
	});
});

// Main streaming handler
export const streamChatResponse = httpAction(async (ctx, request) => {
	try {
		// Parse and validate request body
		const body = (await request.json()) as HTTPStreamingRequest;
		const {
			threadClientId,
			messages: mostRecentUiMessage,
			options,
			userMessageId,
			id,
		} = body;

		console.log("[streamChatResponse] body", body);

		// Validate required fields
		if (!threadClientId) {
			return new Response("Thread client ID is required", {
				status: 400,
				headers: corsHeaders(),
			});
		}

		if (!userMessageId) {
			return new Response("User message ID is required", {
				status: 400,
				headers: corsHeaders(),
			});
		}

		if (!id) {
			return new Response("Assistant message ID is required", {
				status: 400,
				headers: corsHeaders(),
			});
		}

		if (!mostRecentUiMessage || mostRecentUiMessage.length === 0) {
			return new Response("Messages are required", {
				status: 400,
				headers: corsHeaders(),
			});
		}

		// run auth check
		const userId = await getAuthenticatedUserId(ctx);
		if (!userId) {
			return new Response("Unauthorized", {
				status: 401,
				headers: corsHeaders(),
			});
		}

		// Get the thread by client ID
		// The thread, user message, and assistant message should already exist from optimistic creation
		const thread = await ctx.runQuery(api.threads.getByClientId, {
			clientId: threadClientId,
		});
		if (!thread) {
			return new Response(
				"Thread not found. Ensure thread is created before streaming.",
				{
					status: 404,
					headers: corsHeaders(),
				},
			);
		}

		// get the assistant message
		const assistantMessage = await ctx.runQuery(api.messages.get, {
			messageId: id,
		});
		if (!assistantMessage) {
			return new Response("Assistant message not found", {
				status: 404,
				headers: corsHeaders(),
			});
		}

		// get the user message
		const userMessage = await ctx.runQuery(api.messages.get, {
			messageId: userMessageId,
		});
		if (!userMessage) {
			return new Response("User message not found", {
				status: 404,
				headers: corsHeaders(),
			});
		}

		// get all thread messages
		const threadMessages = await ctx.runQuery(api.messages.listByClientId, {
			clientId: threadClientId,
		});

		// Get user's API keys for the AI provider
		// @todo rework.
		const userApiKeys = (await ctx.runMutation(
			internal.userSettings.getDecryptedApiKeys,
			{ userId: thread.userId },
		)) as {
			anthropic?: string;
			openai?: string;
			openrouter?: string;
		} | null;

		// @todo find somewhere to put this...
		const convertToUIMessages: (messages: DbMessage[]) => UIMessage[] = (
			messages: DbMessage[],
		) => {
			return messages.map((message) => {
				return {
					id: message._id,
					role: message.role as UIMessage["role"],
					parts: message.parts?.map((part) => {
						if (part.type === "text") {
							return {
								type: "text",
								text: part.text,
							} as TextUIPart;
						}

						if (part.type === "reasoning") {
							return {
								type: "reasoning",
								text: part.text,
							} as ReasoningUIPart;
						}
					}) as UIMessage["parts"],
				};
			});
		};

		// Convert UIMessages to ModelMessages for the AI SDK
		const convertedMessages = convertToModelMessages(
			convertToUIMessages(threadMessages),
		);
		const modelId = assistantMessage.modelId;

		// Build the final messages array with system prompt
		const systemPrompt = createSystemPrompt(
			modelId as ModelId,
			options?.webSearchEnabled,
		);

		const messages: ModelMessage[] = [
			{
				role: "system",
				content: systemPrompt,
			},
			...convertedMessages,
		];

		const provider = getProviderFromModelId(modelId as ModelId);
		const model = getModelById(modelId as ModelId);

		// Create AI client
		const ai = createAIClient(modelId as ModelId, userApiKeys || undefined);

		// Create debounced writers for streaming content
		const textWriter = new StreamingTextWriter(assistantMessage._id, ctx);
		const reasoningWriter = new StreamingReasoningWriter(
			assistantMessage._id,
			ctx,
		);

		// Track state
		let fullText = "";
		let hasTransitionedToStreaming = false;

		// Helper to transition to streaming status on first chunk
		const transitionToStreaming = async () => {
			if (!hasTransitionedToStreaming) {
				await ctx.runMutation(internal.messages.updateMessageStatus, {
					messageId: assistantMessage._id,
					status: "streaming",
				});
				hasTransitionedToStreaming = true;
			}
		};

		try {
			// Prepare generation options
			const generationOptions: Parameters<typeof streamText>[0] = {
				model: ai,
				messages,
				temperature: 0.7,
				// _internal: {
				// 	generateId: () => assistantMessage._id,
				// },
				experimental_transform: smoothStream({
					delayInMs: getModelStreamingDelay(modelId as ModelId),
					chunking: "word",
				}),
				onChunk: async ({ chunk }) => {
					// Handle Vercel AI SDK v5 chunk types
					switch (chunk.type) {
						case "text":
							if (chunk.text) {
								textWriter.append(chunk.text);
								fullText += chunk.text;
							}
							break;

						case "reasoning":
							if (chunk.text) {
								reasoningWriter.append(chunk.text);
							}
							break;

						case "raw":
							// Add raw part for unstructured data
							await ctx.runMutation(internal.messages.addRawPart, {
								messageId: assistantMessage._id,
								rawValue: chunk.rawValue,
							});
							break;

						case "tool-call":
							// Add tool call to database
							await ctx.runMutation(internal.messages.addToolCallPart, {
								messageId: assistantMessage._id,
								toolCallId: chunk.toolCallId,
								toolName: chunk.toolName,
								args: chunk.input || {},
								state: "call",
							});
							break;

						case "tool-result":
							// Update tool call with result
							await ctx.runMutation(internal.messages.updateToolCallPart, {
								messageId: assistantMessage._id,
								toolCallId: chunk.toolCallId,
								result: chunk.output,
								state: "result",
							});
							break;


						default:
							// Log unexpected chunk types for debugging
							console.warn("Unexpected chunk type:", chunk.type, chunk);
					}
				},
				onFinish: async (result) => {
					// Flush any remaining content
					await Promise.all([textWriter.flush(), reasoningWriter.flush()]);

					// Clean up writers
					textWriter.dispose();
					reasoningWriter.dispose();

					await ctx.runMutation(internal.messages.addUsage, {
						messageId: assistantMessage._id,
						usage: {
							inputTokens: result.usage.inputTokens || 0,
							outputTokens: result.usage.outputTokens || 0,
							totalTokens: result.usage.totalTokens || 0,
							reasoningTokens: result.usage.reasoningTokens || 0,
							cachedInputTokens: result.usage.cachedInputTokens || 0,
						},
					});

					// Mark message as complete
					await ctx.runMutation(internal.messages.updateMessageStatus, {
						messageId: assistantMessage._id,
						status: "submitted",
					});
				},
				onError: async ({ error }) => {
					// Flush any partial content
					await Promise.all([
						textWriter.flush().catch(console.error),
						reasoningWriter.flush().catch(console.error),
					]);

					// Clean up writers
					textWriter.dispose();
					reasoningWriter.dispose();

					// Extract error information
					const errorMessage = error instanceof Error ? error.message : String(error);
					const errorName = error instanceof Error ? error.name : "Unknown Error";
					const errorStack = error instanceof Error ? error.stack : undefined;

					// Log specific error types for monitoring
					if (errorMessage.includes("rate limit")) {
						console.error("Rate limit error during streaming:", error);
					} else if (errorMessage.includes("timeout")) {
						console.error("Timeout error during streaming:", error);
					} else {
						console.error("Streaming error:", error);
					}

					// Update message status to error
					await ctx.runMutation(internal.messages.updateMessageStatus, {
						messageId: assistantMessage._id,
						status: "error",
					});

					// Add error part to message for visibility
					await ctx.runMutation(internal.messages.addErrorPart, {
						messageId: assistantMessage._id,
						errorMessage: errorMessage || "An error occurred during streaming",
						errorDetails: {
							name: errorName,
							stack: errorStack,
							raw: error,
						},
					});
				},
			};

			// Add thinking mode configuration for Anthropic
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
			const result = streamText(generationOptions);

			// Immediately transition to streaming status
			await transitionToStreaming();

			// Return the stream response
			// The frontend will handle merging assistant messages with user messages
			return result.toUIMessageStreamResponse({
				headers: corsHeaders(),
				// @todo more docs on this. this how we add assitant message id to the streaming response.
				// because vercel ai sdk auto-generates the message id in streamText.
				messageMetadata: () => {
					return {
						id: assistantMessage._id,
					};
				},
			});
		} catch (error) {
			// Only clean up if onError wasn't called
			// (onError handles its own cleanup)
			if (!hasTransitionedToStreaming) {
				// Clean up writers on error
				await Promise.all([
					textWriter.flush().catch(console.error),
					reasoningWriter.flush().catch(console.error),
				]);

				textWriter.dispose();
				reasoningWriter.dispose();

				console.error("Pre-streaming error:", error);

				// Handle error that occurred before streaming started
				await handleAIResponseError(
					ctx,
					error,
					thread._id,
					assistantMessage._id,
					{
						modelId: modelId as ModelId,
						provider: getProviderFromModelId(modelId as ModelId),
						useStreamingUpdate: true,
					},
				);
			}

			throw error;
		}
	} catch (error) {
		console.error("HTTP streaming error:", error);
		return new Response(
			JSON.stringify({
				error:
					error instanceof Error ? error.message : "Failed to start streaming",
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
					...corsHeaders(),
				},
			},
		);
	}
});
