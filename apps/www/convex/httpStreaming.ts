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

export const streamChatResponse = httpAction(async (ctx, request) => {
	console.log("[HTTP Streaming] ===== REQUEST START =====");
	console.log("[HTTP Streaming] Method:", request.method);
	console.log("[HTTP Streaming] URL:", request.url);

	// Handle CORS preflight
	if (request.method === "OPTIONS") {
		console.log("[HTTP Streaming] Handling CORS preflight");
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
		console.log("[HTTP Streaming] Parsing request body...");
		const body = (await request.json()) as HTTPStreamingRequest;

		console.log("[HTTP Streaming] Raw body:", JSON.stringify(body, null, 2));

		const {
			threadId: requestThreadId,
			clientId,
			modelId,
			messages: uiMessages,
			options,
		} = body;

		console.log("[HTTP Streaming] Parsed request:", {
			threadId: requestThreadId,
			clientId,
			modelId,
			hasUIMessages: !!uiMessages,
			messageCount: uiMessages?.length,
			options,
		});

		if (uiMessages && uiMessages.length > 0) {
			console.log("[HTTP Streaming] UI Messages:");
			uiMessages.forEach((msg, idx) => {
				console.log(
					`  [${idx}] Role: ${msg.role}, Parts: ${msg.parts?.length || 0}`,
				);
				if (msg.parts) {
					msg.parts.forEach((part, partIdx) => {
						if (part.type === "text") {
							console.log(
								`    [${partIdx}] Text: ${(part as { text: string }).text.substring(0, 100)}...`,
							);
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

		console.log(
			"[HTTP Streaming] Thread resolution - requestThreadId:",
			requestThreadId,
			"clientId:",
			clientId,
		);

		if (!requestThreadId && !clientId) {
			// No thread ID or client ID provided
			console.error(
				"[HTTP Streaming] ERROR: No thread ID or client ID provided",
			);
			return new Response("Thread ID or client ID required", {
				status: 400,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			});
		}

		// Try to find thread by clientId first, then by threadId
		if (clientId) {
			console.log("[HTTP Streaming] Looking up thread by clientId:", clientId);
			thread = await ctx.runQuery(api.threads.getByClientId, { clientId });
			if (!thread) {
				// Create new thread for this clientId (without messages - we'll create them below)
				console.log("[HTTP Streaming] Creating new thread for clientId:", clientId);
				
				// Get authenticated user ID first
				const authHeader = request.headers.get("authorization");
				if (!authHeader?.startsWith("Bearer ")) {
					throw new Error("No valid authentication provided");
				}
				
				// Use the existing auth handling from the endpoint
				const now = Date.now();
				threadId = await ctx.runMutation(api.threads.create, {
					title: "", // Will be auto-generated from first message
					clientId,
				});
				
				// Fetch the newly created thread
				thread = await ctx.runQuery(api.threads.get, { threadId });
				console.log("[HTTP Streaming] Created new thread:", threadId);
			} else {
				threadId = thread._id;
				console.log(
					"[HTTP Streaming] Found existing thread by clientId. ThreadId:",
					threadId,
				);
			}
		} else if (requestThreadId) {
			threadId = requestThreadId;
			console.log("[HTTP Streaming] Looking up thread by threadId:", threadId);
			thread = await ctx.runQuery(api.threads.get, { threadId });
			if (!thread) {
				console.error(
					"[HTTP Streaming] ERROR: Thread not found by threadId:",
					threadId,
				);
				return new Response("Thread not found", {
					status: 404,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "POST",
						"Access-Control-Allow-Headers": "Content-Type, Authorization",
					},
				});
			}
			console.log("[HTTP Streaming] Found thread by threadId");
		} else {
			// This should never happen due to the check above
			console.error("[HTTP Streaming] ERROR: Invalid request state");
			return new Response("Invalid request", {
				status: 400,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			});
		}

		// Save the latest user message to database
		// The HTTP streaming request is triggered by a new user message, so we only need to save the latest one
		if (uiMessages && uiMessages.length > 0) {
			console.log(
				"[HTTP Streaming] Looking for the latest user message to save...",
			);

			// Find the latest user message (the one that triggered this request)
			const userMessages = uiMessages.filter((msg) => msg.role === "user");

			if (userMessages.length > 0) {
				const latestUserMessage = userMessages[userMessages.length - 1];

				// Extract text content from the latest user message
				const textParts = latestUserMessage.parts
					.filter((part) => part.type === "text")
					.map((part) => (part as { text: string }).text)
					.join("\n");

				if (textParts.trim()) {
					// Save only the latest user message with parts
					const savedMessageId = await ctx.runMutation(
						internal.messages.create,
						{
							threadId,
							messageType: "user",
						},
					);
					console.log(
						"[HTTP Streaming] Saved latest user message with ID:",
						savedMessageId,
					);

					// Add the parts from the user message
					// Since user messages are text-only, we just need to add text parts
					await ctx.runMutation(internal.messages.addTextPart, {
						messageId: savedMessageId,
						text: textParts,
					});
				}
			}
		}

		let messageId: Id<"messages">;

		// Use existing message or create new one
		if (options?.useExistingMessage) {
			messageId = options.useExistingMessage;
			console.log("[HTTP Streaming] Using existing message:", messageId);
		} else {
			// Create new message
			console.log("[HTTP Streaming] Creating new assistant message...");
			try {
				messageId = await ctx.runMutation(internal.messages.create, {
					threadId,
					messageType: "assistant",
					modelId: modelId as ModelId,
				});
				console.log("[HTTP Streaming] Created new message:", messageId);
			} catch (error) {
				console.error("[HTTP Streaming] ERROR creating message:", error);
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

		// Build conversation messages using modern parts-based approach
		if (!uiMessages || uiMessages.length === 0) {
			throw new Error(
				"UIMessages required - legacy thread-based fallback removed",
			);
		}

		console.log("[HTTP Streaming] Converting UIMessages to ModelMessages...");

		// Convert UIMessages to ModelMessages using SDK function
		const convertedMessages = convertToModelMessages(uiMessages as UIMessage[]);

		console.log(
			"[HTTP Streaming] Raw converted messages:",
			JSON.stringify(convertedMessages, null, 2),
		);

		// Filter out messages with empty content (Anthropic doesn't allow this)
		const validMessages = convertedMessages.filter((msg) => {
			const hasValidContent = Array.isArray(msg.content)
				? msg.content.length > 0
				: msg.content && msg.content.trim().length > 0;

			if (!hasValidContent) {
				console.log(
					"[HTTP Streaming] Filtering out message with empty content:",
					JSON.stringify(msg, null, 2),
				);
			}

			return hasValidContent;
		});

		console.log(
			"[HTTP Streaming] Valid messages after filtering:",
			JSON.stringify(validMessages, null, 2),
		);

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

		console.log("[HTTP Streaming] Final messages count:", messages.length);

		const provider = getProviderFromModelId(modelId as ModelId);
		const model = getModelById(modelId as ModelId);

		console.log(
			`[HTTP Streaming] Starting AI generation with ${provider} model ${model.id}`,
		);

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
