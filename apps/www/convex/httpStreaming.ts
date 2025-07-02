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
  type UIMessage,
  convertToModelMessages,
  smoothStream,
  streamText,
} from "ai";
import { stepCountIs } from "ai";
import type { Infer } from "convex/values";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { ModelId } from "../src/lib/ai/schemas";
import {
  getModelById,
  getModelConfig,
  getProviderFromModelId,
  isThinkingMode,
} from "../src/lib/ai/schemas";
import { api, internal } from "./_generated/api";
import { httpAction, internalMutation } from "./_generated/server";
import { createAIClient } from "./lib/ai_client";
import { createWebSearchTool } from "./lib/ai_tools";
import { createSystemPrompt } from "./lib/message_builder";
import { getModelStreamingDelay } from "./lib/streaming_config";
import { handleAIResponseError } from "./messages/helpers";
import {
  type httpStreamingRequestValidator,
  modelIdValidator,
} from "./validators";

// Types from validators
type HTTPStreamingRequest = Infer<typeof httpStreamingRequestValidator>;

// Helper function for CORS headers
function corsHeaders(): HeadersInit {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	};
}

// CORS preflight handler
export const corsHandler = httpAction(async (ctx, request) => {
	return new Response(null, {
		status: 200,
		headers: corsHeaders(),
	});
});

// Internal mutation to create assistant message placeholder
export const createAssistantMessage = internalMutation({
	args: {
		threadId: v.id("threads"),
		modelId: modelIdValidator,
	},
	returns: v.id("messages"),
	handler: async (ctx, args) => {
		const provider = getProviderFromModelId(args.modelId as ModelId);

		// Create assistant message with "submitted" status
		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			parts: [], // Start with empty parts, will be filled during streaming
			role: "assistant",
			modelId: args.modelId,
			model: provider,
			status: "submitted",
		});

		return messageId;
	},
});

// Main streaming handler
export const streamChatResponse = httpAction(async (ctx, request) => {
	try {
		// Parse and validate request body
		const body = (await request.json()) as HTTPStreamingRequest;
		const { clientId, modelId, messages: uiMessages, options, assistantMessageId } = body;

		// Validate required fields
		if (!clientId) {
			return new Response("Client ID is required", {
				status: 400,
				headers: corsHeaders(),
			});
		}

		if (!uiMessages || uiMessages.length === 0) {
			return new Response("Messages are required", {
				status: 400,
				headers: corsHeaders(),
			});
		}

		// Get the thread by client ID
		// The thread and user message should already exist from optimistic creation
		const thread = await ctx.runQuery(api.threads.getByClientId, { clientId });
		if (!thread) {
			return new Response(
				"Thread not found. Ensure thread is created before streaming.",
				{
					status: 404,
					headers: corsHeaders(),
				},
			);
		}

		const threadId = thread._id;

		// Use provided assistant message ID or create a new one
		let messageId: Id<"messages">;

		if (assistantMessageId) {
			// Use the optimistically created assistant message
			messageId = assistantMessageId as Id<"messages">;

			// Update the message status to indicate streaming is starting
			await ctx.runMutation(internal.messages.updateMessageStatus, {
				messageId,
				status: "submitted",
			});
		} else {
			// Create assistant message placeholder (fallback for non-optimistic flows)
			messageId = await ctx.runMutation(createAssistantMessage, {
				threadId,
				modelId: modelId as ModelId,
			});
		}

		// Get user's API keys for the AI provider
		const userApiKeys = (await ctx.runMutation(
			internal.userSettings.getDecryptedApiKeys,
			{ userId: thread.userId },
		)) as {
			anthropic?: string;
			openai?: string;
			openrouter?: string;
		} | null;

		// Convert UIMessages to ModelMessages for the AI SDK
		const convertedMessages = convertToModelMessages(uiMessages as UIMessage[]);

		// Filter out messages with empty content
		const validMessages = convertedMessages.filter((msg) => {
			const hasValidContent = Array.isArray(msg.content)
				? msg.content.length > 0
				: msg.content && msg.content.trim().length > 0;
			return hasValidContent;
		});

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
							// Log unexpected chunk types for debugging
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
			console.log(
				"[HTTP Streaming] Starting streamText with",
				messages.length,
				"messages",
			);
			const result = streamText(generationOptions);

			// Return the stream response
			// The frontend will handle merging assistant messages with user messages
			return result.toUIMessageStreamResponse({
				headers: corsHeaders(),
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
