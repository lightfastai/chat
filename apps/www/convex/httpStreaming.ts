import { type CoreMessage, smoothStream, streamText, } from "ai";
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
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, httpAction } from "./_generated/server";
import { createAIClient } from "./lib/ai_client";
import { createWebSearchTool } from "./lib/ai_tools";
import { createSystemPrompt } from "./lib/message_builder";
import { getModelStreamingDelay } from "./lib/streaming_config";
import { handleAIResponseError } from "./messages/helpers";
import type { httpStreamingRequestValidator } from "./validators";

// Types from validators
type HTTPStreamingRequest = Infer<typeof httpStreamingRequestValidator>;

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
		// Parse request body
		const body = (await request.json()) as HTTPStreamingRequest;
		const { threadId, modelId, options } = body;

		console.log("HTTP Streaming request:", {
			threadId,
			modelId,
			useExistingMessage: options?.useExistingMessage,
		});

		// Verify thread exists
		const thread = await ctx.runQuery(api.threads.get, { threadId });
		if (!thread) {
			return new Response("Thread not found", { status: 404 });
		}

		let messageId: Id<"messages">;

		// Use existing message or create new one
		if (options?.useExistingMessage) {
			messageId = options.useExistingMessage;
			console.log("Using existing message:", messageId);
		} else {
			// Create new message
			messageId = await ctx.runMutation(internal.messages.create, {
				threadId,
				messageType: "assistant",
				body: "",
				modelId: modelId as ModelId,
				isStreaming: true,
			});
			console.log("Created new message:", messageId);
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

		// Build conversation messages
		const messages = await buildConversationMessagesForStreams(
			ctx,
			threadId,
			modelId as ModelId,
			options?.webSearchEnabled,
		);

		const provider = getProviderFromModelId(modelId as ModelId);
		const model = getModelById(modelId as ModelId);

		console.log(`Starting AI generation with ${provider} model ${model.id}`);

		// Create AI client
		const ai = createAIClient(modelId as ModelId, userApiKeys || undefined);

		// Track state for database updates
		let pendingText = "";
		let pendingReasoning = "";
		let fullText = "";
		let updateTimer: NodeJS.Timeout | null = null;

		// Helper to update database
		const updateDatabase = async () => {
			if (pendingText) {
				// Update the message body for display
				await ctx.runMutation(internal.messages.updateStreamingMessage, {
					messageId,
					content: fullText,
				});

				// Add text part if not already added
				await ctx.runMutation(internal.messages.addTextPart, {
					messageId,
					text: pendingText,
				});
				pendingText = "";
			}

			if (pendingReasoning) {
				// Add reasoning part
				await ctx.runMutation(internal.messages.addReasoningPart, {
					messageId,
					text: pendingReasoning,
					providerMetadata: undefined,
				});
				pendingReasoning = "";
			}
		};

		// Set up periodic database updates (50ms)
		updateTimer = setInterval(() => {
			updateDatabase().catch(console.error);
		}, 50);

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
					if (chunk.type === "text" && chunk.text) {
						pendingText += chunk.text;
						fullText += chunk.text;
					} else if (chunk.type === "reasoning" && chunk.text) {
						pendingReasoning += chunk.text;
					} else if (chunk.type === "tool-call") {
						// Flush pending text before tool call
						await updateDatabase();

						// Add tool call to database
						await ctx.runMutation(internal.messages.addToolCallPart, {
							messageId,
							toolCallId: chunk.toolCallId,
							toolName: chunk.toolName,
							args: chunk.input || {},
							state: "call",
						});
					} else if (chunk.type === "tool-result") {
						// Update tool call with result
						await ctx.runMutation(internal.messages.updateToolCallPart, {
							messageId,
							toolCallId: chunk.toolCallId,
							result: chunk.output,
							state: "result",
						});
					}
				},
				onFinish: async () => {
					// Clear timer
					if (updateTimer) {
						clearInterval(updateTimer);
					}

					// Final database update
					await updateDatabase();

					// Update the message to mark it as complete
					await ctx.runMutation(internal.messages.updateStreamingMessage, {
						messageId,
						content: fullText,
					});

					// Clear generation flag
					await ctx.runMutation(internal.messages.clearGenerationFlag, {
						threadId,
					});

					console.log(`Streaming completed for message ${messageId}`);
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
			const result = streamText(generationOptions);

			return result.toUIMessageStreamResponse({
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
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
