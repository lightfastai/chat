import { type CoreMessage, smoothStream, streamText } from "ai";
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
import { type ActionCtx, httpAction } from "./_generated/server";
import { createAIClient } from "./lib/ai_client";
import { createWebSearchTool } from "./lib/ai_tools";
import { createSystemPrompt } from "./lib/message_builder";
import { getModelStreamingDelay } from "./lib/streaming_config";
import { handleAIResponseError } from "./messages/helpers";
import type {
	httpStreamingRequestValidator,
	uiMessageValidator,
} from "./validators";

// Types from validators
type HTTPStreamingRequest = Infer<typeof httpStreamingRequestValidator>;
type UIMessage = Infer<typeof uiMessageValidator>;

// Helper function to convert UIMessages to CoreMessages for AI SDK
async function convertUIMessagesToCoreMessages(
	ctx: ActionCtx,
	uiMessages: UIMessage[],
	modelId: ModelId,
	webSearchEnabled?: boolean,
): Promise<CoreMessage[]> {
	const provider = getProviderFromModelId(modelId);
	const systemPrompt = createSystemPrompt(modelId, webSearchEnabled);

	const messages: CoreMessage[] = [
		{
			role: "system",
			content: systemPrompt,
		},
	];

	// Convert each UIMessage to CoreMessage
	for (const uiMessage of uiMessages) {
		if (uiMessage.role === "system") {
			// Skip system messages as we already have system prompt
			continue;
		}

		// Extract content from UI message parts
		const content = await buildContentFromUIParts(
			ctx,
			uiMessage.parts,
			provider,
			modelId,
		);

		messages.push({
			role: uiMessage.role,
			content,
		});
	}

	return messages;
}

// Helper to build content from UI message parts
async function buildContentFromUIParts(
	_ctx: ActionCtx,
	parts: UIMessage["parts"],
	_provider: string,
	_modelId: ModelId,
): Promise<string | any[]> {
	// For text-only messages, return string content
	const textParts = parts.filter((p) => p.type === "text");
	if (parts.length === textParts.length) {
		return textParts.map((p) => (p as any).text).join("");
	}

	// For multimodal messages, build content array
	const contentParts: any[] = [];

	for (const part of parts) {
		if (part.type === "text") {
			contentParts.push({
				type: "text",
				text: (part as any).text,
			});
		} else if (part.type === "file") {
			// Handle file attachments by fetching from storage
			// This would need to be implemented based on your file storage
			contentParts.push({
				type: "image",
				image: (part as any).url, // Assuming URL is accessible
			});
		}
		// Add other part type handling as needed
	}

	return contentParts;
}

// Helper function to build conversation messages from thread (fallback)
async function buildConversationMessagesFromThread(
	ctx: ActionCtx,
	threadId: Id<"threads">,
	modelId: ModelId,
	webSearchEnabled?: boolean,
): Promise<CoreMessage[]> {
	// Get recent conversation context from thread
	const recentMessages: Array<{
		body: string;
		messageType: "user" | "assistant" | "system";
		attachments?: Id<"files">[];
	}> = await ctx.runQuery(internal.messages.getRecentContext, { threadId });

	const provider = getProviderFromModelId(modelId);
	const systemPrompt = createSystemPrompt(modelId, webSearchEnabled);

	const messages: CoreMessage[] = [
		{
			role: "system",
			content: systemPrompt,
		},
	];

	// Build conversation history with attachments
	for (const msg of recentMessages) {
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
			} as CoreMessage);
		} else if (msg.messageType === "assistant") {
			messages.push({
				role: "assistant",
				content,
			} as CoreMessage);
		}
	}

	return messages;
}

export const streamChatResponseV2 = httpAction(async (ctx, request) => {
	console.log("[HTTP Streaming V2] ===== REQUEST START =====");
	console.log("[HTTP Streaming V2] Method:", request.method);
	console.log("[HTTP Streaming V2] URL:", request.url);

	// Handle CORS preflight
	if (request.method === "OPTIONS") {
		console.log("[HTTP Streaming V2] Handling CORS preflight");
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
		// Parse and validate request body
		console.log("[HTTP Streaming V2] Parsing request body...");
		const body = (await request.json()) as HTTPStreamingRequest;
		
		console.log("[HTTP Streaming V2] Raw body:", JSON.stringify(body, null, 2));
		
		const {
			threadId: requestThreadId,
			clientId,
			modelId,
			messages: uiMessages,
			options,
		} = body;

		console.log("[HTTP Streaming V2] Parsed request:", {
			threadId: requestThreadId,
			clientId,
			modelId,
			hasUIMessages: !!uiMessages,
			messageCount: uiMessages?.length,
			options,
		});
		
		if (uiMessages && uiMessages.length > 0) {
			console.log("[HTTP Streaming V2] UI Messages:");
			uiMessages.forEach((msg, idx) => {
				console.log(`  [${idx}] Role: ${msg.role}, Parts: ${msg.parts?.length || 0}`);
				if (msg.parts) {
					msg.parts.forEach((part, partIdx) => {
						if (part.type === "text") {
							console.log(`    [${partIdx}] Text: ${(part as any).text.substring(0, 100)}...`);
						} else {
							console.log(`    [${partIdx}] Type: ${part.type}`);
						}
					});
				}
			});
		}

		// Handle thread creation for new chats
		let threadId: Id<"threads">;
		let thread: Doc<"threads"> | null;

		console.log("[HTTP Streaming V2] Thread resolution - requestThreadId:", requestThreadId, "clientId:", clientId);

		if (!requestThreadId && !clientId) {
			// No thread ID or client ID provided
			console.error("[HTTP Streaming V2] ERROR: No thread ID or client ID provided");
			return new Response(
				"Thread ID or client ID required",
				{ status: 400 },
			);
		}

		// Try to find thread by clientId first, then by threadId
		if (clientId) {
			console.log("[HTTP Streaming V2] Looking up thread by clientId:", clientId);
			thread = await ctx.runQuery(api.threads.getByClientId, { clientId });
			if (!thread) {
				console.error("[HTTP Streaming V2] ERROR: Thread not found by clientId:", clientId);
				return new Response("Thread not found by client ID", { status: 404 });
			}
			threadId = thread._id;
			console.log("[HTTP Streaming V2] Found thread by clientId. ThreadId:", threadId);
		} else if (requestThreadId) {
			threadId = requestThreadId;
			console.log("[HTTP Streaming V2] Looking up thread by threadId:", threadId);
			thread = await ctx.runQuery(api.threads.get, { threadId });
			if (!thread) {
				console.error("[HTTP Streaming V2] ERROR: Thread not found by threadId:", threadId);
				return new Response("Thread not found", { status: 404 });
			}
			console.log("[HTTP Streaming V2] Found thread by threadId");
		} else {
			// This should never happen due to the check above
			console.error("[HTTP Streaming V2] ERROR: Invalid request state");
			return new Response("Invalid request", { status: 400 });
		}

		let messageId: Id<"messages">;

		// Use existing message or create new one
		if (options?.useExistingMessage) {
			messageId = options.useExistingMessage;
			console.log("[HTTP Streaming V2] Using existing message:", messageId);
		} else {
			// Create new message
			console.log("[HTTP Streaming V2] Creating new assistant message...");
			try {
				messageId = await ctx.runMutation(internal.messages.create, {
					threadId,
					messageType: "assistant",
					body: "",
					modelId: modelId as ModelId,
					isStreaming: true,
				});
				console.log("[HTTP Streaming V2] Created new message:", messageId);
			} catch (error) {
				console.error("[HTTP Streaming V2] ERROR creating message:", error);
				throw error;
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

		// Build conversation messages
		let messages: CoreMessage[];
		if (uiMessages && uiMessages.length > 0) {
			// Use provided UIMessages
			console.log("[HTTP Streaming V2] Converting UIMessages to CoreMessages...");
			messages = await convertUIMessagesToCoreMessages(
				ctx,
				uiMessages,
				modelId as ModelId,
				options?.webSearchEnabled,
			);
			console.log("[HTTP Streaming V2] Converted messages count:", messages.length);
		} else {
			// Fallback to building from thread history
			console.log("[HTTP Streaming V2] No UIMessages provided, building from thread history...");
			messages = await buildConversationMessagesFromThread(
				ctx,
				threadId,
				modelId as ModelId,
				options?.webSearchEnabled,
			);
			console.log("[HTTP Streaming V2] Built messages from history, count:", messages.length);
		}

		const provider = getProviderFromModelId(modelId as ModelId);
		const model = getModelById(modelId as ModelId);

		console.log(`[HTTP Streaming V2] Starting AI generation with ${provider} model ${model.id}`);

		// Create AI client
		const ai = createAIClient(modelId as ModelId, userApiKeys || undefined);

		// Track state for database updates
		let pendingText = "";
		let pendingReasoning = "";
		let fullText = "";
		let updateTimer: NodeJS.Timeout | null = null;

		// Helper to update text content
		const updateTextContent = async () => {
			if (!pendingText) return;

			// Update the message body for display
			await ctx.runMutation(internal.messages.updateStreamingMessage, {
				messageId,
				content: fullText,
			});

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
								pendingText += chunk.text;
								fullText += chunk.text;
							}
							break;

						case "reasoning":
							if (chunk.text) {
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
			console.log("[HTTP Streaming V2] Starting streamText with", messages.length, "messages");
			const result = streamText(generationOptions);

			// Add thread ID to response headers for new chats
			const responseHeaders: HeadersInit = {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			};

			// Include thread ID in headers for the client to update its state
			if (!requestThreadId && threadId) {
				responseHeaders["X-Thread-Id"] = threadId;
				console.log("[HTTP Streaming V2] Including thread ID in response headers:", threadId);
			}

			console.log("[HTTP Streaming V2] Returning UI message stream response");
			return result.toUIMessageStreamResponse({
				headers: responseHeaders,
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
