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
	type ModelId,
	getModelById,
	getModelConfig,
	getModelStreamingDelay,
	getProviderFromModelId,
	isThinkingMode,
} from "@lightfast/ai/providers";
import {
	LIGHTFAST_TOOLS,
	type LightfastToolSet,
	validateToolName,
} from "@lightfast/ai/tools";
import {
	type ModelMessage,
	convertToModelMessages,
	smoothStream,
	streamText,
} from "ai";
import { stepCountIs } from "ai";
import type { Infer } from "convex/values";
import {
	type LightfastUIMessage,
	convertDbMessagesToUIMessages,
} from "../src/hooks/convertDbMessagesToUIMessages";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { createAIClient } from "./lib/ai/client";
import { MessagePartWriter } from "./lib/ai/writer/message_part_writer";
import { getAuthenticatedClerkUserId } from "./lib/auth";
import { createSystemPrompt } from "./lib/create_system_prompt";
import {
	createHTTPErrorResponse,
	extractErrorDetails,
	formatErrorMessage,
	handleStreamingSetupError,
	logStreamingError,
} from "./lib/error_handling";
import type { DbToolInputForName, DbToolOutputForName } from "./types";
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
		console.log(
			"[streamChatResponse] webSearchEnabled =",
			options?.webSearchEnabled,
		);

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
		const clerkUserId = await getAuthenticatedClerkUserId(ctx);
		if (!clerkUserId) {
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

		// Verify thread ownership - user can only stream responses for their own threads
		if (thread.clerkUserId !== clerkUserId) {
			return new Response(
				"Forbidden. You can only stream responses for your own threads.",
				{
					status: 403,
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
		// Type safety is ensured by the return type of getDecryptedApiKeys
		const userApiKeys = await ctx.runMutation(
			internal.userSettings.getDecryptedApiKeys,
			{ clerkUserId: clerkUserId },
		);

		// Convert UIMessages to ModelMessages for the AI SDK
		const convertedMessages = convertToModelMessages(
			convertDbMessagesToUIMessages(threadMessages),
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

		// Create message part writer for streaming content
		const writer = new MessagePartWriter(ctx);

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
					// Handle Vercel AI SDK v5 chunk types
					switch (chunk.type) {
						case "text":
							if (chunk.text) {
								writer.appendText(assistantMessage._id, chunk.text);
							}
							break;

						case "reasoning":
							if (chunk.text) {
								writer.appendReasoning(assistantMessage._id, chunk.text);
							}
							break;

						case "raw":
							// Buffer raw part for batch writing
							writer.appendRaw(assistantMessage._id, chunk.rawValue);
							break;

						case "tool-input-start": {
							// Buffer tool input start for batch writing
							// Note: chunk.toolName now includes version (e.g., "web_search_1_0_0")
							const inputToolName = validateToolName(chunk.toolName);

							// Type-safe handling based on specific tool version
							if (inputToolName === "web_search_1_0_0") {
								// Buffer this chunk instead of writing directly
								writer.appendToolInputStart(assistantMessage._id, chunk.id, {
									toolName: inputToolName,
								});
							} else if (inputToolName === "web_search_1_1_0") {
								// Buffer this chunk instead of writing directly
								writer.appendToolInputStart(assistantMessage._id, chunk.id, {
									toolName: inputToolName,
								});
							} else {
								// Handle unknown tool versions
								console.warn(`Unknown tool name: ${inputToolName}`);
							}
							break;
						}

						case "tool-call": {
							// Buffer tool call for batch writing
							// Note: chunk.toolName now includes version (e.g., "web_search_1_0_0")
							const callToolName = validateToolName(chunk.toolName);

							// Type-safe handling based on specific tool version
							// Note: We use type assertion here because the AI SDK doesn't know about our versioned naming
							// The Convex validator will ensure type safety at runtime
							if (callToolName === "web_search_1_0_0") {
								// Buffer this chunk instead of writing directly
								writer.appendToolCall(assistantMessage._id, chunk.toolCallId, {
									toolName: "web_search_1_0_0" as const,
									input: chunk.input as DbToolInputForName<"web_search_1_0_0">, // Runtime validation by Convex validator
								});
							} else if (callToolName === "web_search_1_1_0") {
								// Buffer this chunk instead of writing directly
								writer.appendToolCall(assistantMessage._id, chunk.toolCallId, {
									toolName: "web_search_1_1_0" as const,
									input: chunk.input as DbToolInputForName<"web_search_1_1_0">, // Runtime validation by Convex validator
								});
							} else {
								// Handle unknown tool versions
								console.warn(`Unknown tool name: ${callToolName}`);
							}
							break;
						}

						case "tool-result": {
							// Buffer tool result for batch writing
							// Note: chunk.toolName now includes version (e.g., "web_search_1_0_0")
							const resultToolName = validateToolName(chunk.toolName);

							// Type-safe handling based on specific tool version
							// Note: We use type assertion here because the AI SDK doesn't know about our versioned naming
							// The Convex validator will ensure type safety at runtime
							if (resultToolName === "web_search_1_0_0") {
								// Buffer this chunk instead of writing directly
								writer.appendToolResult(
									assistantMessage._id,
									chunk.toolCallId,
									{
										toolName: "web_search_1_0_0",
										input:
											chunk.input as DbToolInputForName<"web_search_1_0_0">,
										output:
											chunk.output as DbToolOutputForName<"web_search_1_0_0">,
									},
								);
							} else if (resultToolName === "web_search_1_1_0") {
								// Buffer this chunk instead of writing directly
								writer.appendToolResult(
									assistantMessage._id,
									chunk.toolCallId,
									{
										toolName: "web_search_1_1_0",
										input:
											chunk.input as DbToolInputForName<"web_search_1_1_0">,
										output:
											chunk.output as DbToolOutputForName<"web_search_1_1_0">,
									},
								);
							} else {
								// Handle unknown tool versions
								console.warn(`Unknown tool name: ${resultToolName}`);
							}
							break;
						}

						case "source":
							console.log("source chunk", chunk);
							// Buffer source chunks for batch writing
							if (chunk.sourceType === "url") {
								writer.appendSourceUrl(
									assistantMessage._id,
									chunk.id,
									chunk.url,
									chunk.title,
								);
							} else if (chunk.sourceType === "document") {
								writer.appendSourceDocument(
									assistantMessage._id,
									chunk.id,
									chunk.mediaType,
									chunk.title,
									chunk.filename,
								);
							}
							break;

						default:
							// Log unexpected chunk types for debugging
							console.warn("Unexpected chunk type:", chunk.type, chunk);
					}
				},
				onStepFinish: async () => {
					// Flush unified writer on step finish
					await writer.flush();
				},
				onFinish: async (result) => {
					// Dispose writer (which also flushes any remaining content)
					await writer.dispose();

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
					// Dispose writer (which also flushes any partial content)
					await writer.dispose();

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
				generationOptions.activeTools = ["web_search_1_1_0"] as const;
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
			return result.toUIMessageStreamResponse<LightfastUIMessage>({
				headers: corsHeaders(),
				// @todo more docs on this. this how we add assitant message id to the streaming response.
				// because vercel ai sdk auto-generates the message id in streamText.
				messageMetadata: () => {
					return {
						dbId: assistantMessage._id,
					};
				},
			});
		} catch (error) {
			// Clean up writer on error
			await writer.dispose();

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
