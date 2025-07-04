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
import {
	LIGHTFAST_TOOLS,
	type LightfastToolSet,
	validateToolName,
} from "../src/lib/ai/tools";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { createAIClient } from "./lib/ai_client";
import { getAuthenticatedUserId } from "./lib/auth";
import { createSystemPrompt } from "./lib/create_system_prompt";
import {
	createHTTPErrorResponse,
	extractErrorDetails,
	formatErrorMessage,
	handleStreamingSetupError,
	logStreamingError,
} from "./lib/error_handling";
import {
	StreamingReasoningWriter,
	StreamingTextWriter,
} from "./lib/streaming_writers";
import type { DbMessage } from "./types";
import type { modelIdValidator } from "./validators";

interface HTTPStreamingRequest {
	id: Id<"messages">;
	threadClientId: string;
	userMessageId: Id<"messages">;
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
		const { threadClientId, options, userMessageId, id } = body;

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

		const modelMessages: ModelMessage[] = [
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

		try {
			// Prepare generation options
			const generationOptions: Parameters<
				typeof streamText<LightfastToolSet>
			>[0] = {
				model: ai,
				messages: modelMessages,
				temperature: 0.7,
				// _internal: {
				// 	generateId: () => assistantMessage._id,
				// },
				experimental_transform: smoothStream({
					delayInMs: getModelStreamingDelay(modelId as ModelId),
					chunking: "word",
				}),
				onChunk: async ({ chunk }) => {
					const chunkTimestamp = Date.now();

					// Handle Vercel AI SDK v5 chunk types
					switch (chunk.type) {
						case "text":
							if (chunk.text) {
								textWriter.append(chunk.text);
							}
							break;

						case "reasoning":
							if (chunk.text) {
								reasoningWriter.append(chunk.text);
							}
							break;

						case "raw":
							// Add raw part for unstructured data with chunk timestamp
							await ctx.runMutation(internal.messages.addRawPart, {
								messageId: assistantMessage._id,
								rawValue: chunk.rawValue,
								timestamp: chunkTimestamp,
							});
							break;

						case "tool-input-start":
							// Add tool input start to database with chunk timestamp
							await ctx.runMutation(internal.messages.addToolInputStartPart, {
								messageId: assistantMessage._id,
								toolCallId: chunk.id,
								toolName: validateToolName(chunk.toolName),
								timestamp: chunkTimestamp,
							});
							break;

						case "tool-call":
							// Add tool call to database with chunk timestamp
							await ctx.runMutation(internal.messages.addToolCallPart, {
								messageId: assistantMessage._id,
								toolCallId: chunk.toolCallId,
								toolName: chunk.toolName,
								input: chunk.input || {},
								timestamp: chunkTimestamp,
							});
							break;

						case "tool-result":
							// Update tool call with result
							await ctx.runMutation(internal.messages.addToolResultCallPart, {
								messageId: assistantMessage._id,
								toolCallId: chunk.toolCallId,
								toolName: chunk.toolName,
								input: chunk.input || {},
								output: chunk.output,
								timestamp: chunkTimestamp,
							});
							break;

						case "source":
							if (chunk.sourceType === "url") {
								await ctx.runMutation(internal.messages.addSourceUrlPart, {
									messageId: assistantMessage._id,
									sourceId: chunk.id,
									url: chunk.url,
									title: chunk.title,
									providerMetadata: chunk.providerMetadata,
									timestamp: chunkTimestamp,
								});
							} else if (chunk.sourceType === "document") {
								await ctx.runMutation(internal.messages.addSourceDocumentPart, {
									messageId: assistantMessage._id,
									sourceId: chunk.id,
									mediaType: chunk.mediaType,
									title: chunk.title,
									filename: chunk.filename,
									providerMetadata: chunk.providerMetadata,
									timestamp: chunkTimestamp,
								});
							}
							break;

						default:
							// Log unexpected chunk types for debugging
							console.warn("Unexpected chunk type:", chunk.type, chunk);
					}
				},
				onStepFinish: async (stepResult) => {
					if (stepResult.reasoning.length > 0) {
						await reasoningWriter.flush();
					}

					if (stepResult.text.length > 0) {
						await textWriter.flush();
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
						status: "ready",
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

					// Use enhanced composable error handling functions
					logStreamingError(error, "StreamingResponse");

					const userFriendlyMessage = formatErrorMessage(error);
					const errorDetails = extractErrorDetails(
						error,
						"streaming_response",
						modelId as ModelId,
					);

					// Update message status to error
					await ctx.runMutation(internal.messages.updateMessageStatus, {
						messageId: assistantMessage._id,
						status: "error",
					});

					// Add error part with validated structured details
					await ctx.runMutation(internal.messages.addErrorPart, {
						messageId: assistantMessage._id,
						errorMessage: userFriendlyMessage,
						errorDetails,
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
				generationOptions.tools = LIGHTFAST_TOOLS;
				generationOptions.stopWhen = stepCountIs(5);
			}

			// Stream the text and return UI message stream response
			const result = streamText<LightfastToolSet>(generationOptions);

			// Immediately transition to streaming status
			await ctx.runMutation(internal.messages.updateMessageStatus, {
				messageId: assistantMessage._id,
				status: "streaming",
			});

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
			// Clean up writers on error
			await Promise.all([
				textWriter.flush().catch(console.error),
				reasoningWriter.flush().catch(console.error),
			]);

			textWriter.dispose();
			reasoningWriter.dispose();

			// Handle error that occurred during streaming setup
			await handleStreamingSetupError(
				ctx,
				error,
				assistantMessage._id,
				modelId as ModelId,
			);

			throw error;
		}
	} catch (error) {
		console.error("HTTP streaming error:", error);
		return createHTTPErrorResponse(error);
	}
});
