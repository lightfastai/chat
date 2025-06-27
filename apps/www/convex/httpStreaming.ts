import type { FunctionReturnType } from "convex/server";
import type { Infer } from "convex/values";
import type { ModelId } from "../src/lib/ai/schemas";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import type {
	httpStreamChunkValidator,
	httpStreamingRequestValidator,
} from "./validators";

// Types from validators
type StreamWithChunks = NonNullable<
	FunctionReturnType<typeof internal.streams.getStreamWithChunks>
>;
type HTTPStreamingRequest = Infer<typeof httpStreamingRequestValidator>;
type StreamChunk = Infer<typeof httpStreamChunkValidator>;

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
		const { threadId, modelId, messages } = body;

		console.log("HTTP Streaming request:", {
			threadId,
			modelId,
			messageCount: messages?.length,
		});

		// Verify thread exists and user has access
		const thread = await ctx.runQuery(api.threads.get, { threadId });
		if (!thread) {
			return new Response("Thread not found", { status: 404 });
		}

		// Create a stream first
		const streamId = await ctx.runMutation(internal.streams.create, {
			userId: thread.userId,
			metadata: { threadId, modelId },
		});

		// Create initial AI message with streamId
		const messageId = await ctx.runMutation(internal.messages.create, {
			threadId,
			messageType: "assistant",
			body: "",
			modelId: modelId as ModelId,
			isStreaming: true,
			streamId,
		});

		// Schedule the AI response generation using the stream system
		await ctx.scheduler.runAfter(
			0,
			internal.generateAIResponseWithStreams.generateAIResponseWithStreams,
			{
				threadId,
				messageId,
				streamId,
				modelId: modelId as ModelId,
				webSearchEnabled: false, // Can be configured from request
			},
		);

		// Create HTTP streaming response that polls the stream for updates
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				let lastChunkIndex = -1;
				const pollInterval = 100; // Poll every 100ms
				const maxPolls = 600; // Max 60 seconds
				let pollCount = 0;

				// Send initial response with streamId and messageId
				const initChunk = `${JSON.stringify({
					type: "init",
					streamId,
					messageId,
					timestamp: Date.now(),
				})}\n`;
				controller.enqueue(encoder.encode(initChunk));

				// Poll for stream updates
				const pollStream = async () => {
					try {
						const streamData = await ctx.runQuery(
							internal.streams.getStreamWithChunks,
							{
								streamId,
							},
						);

						if (!streamData) {
							throw new Error("Stream not found");
						}

						// Send any new chunks since last poll
						const newChunks = streamData.chunks.slice(lastChunkIndex + 1);
						for (const chunk of newChunks) {
							lastChunkIndex++;

							let chunkData: StreamChunk = {
								type: "text-delta",
								text: chunk.text,
								messageId,
								streamId,
								timestamp: chunk.createdAt || chunk._creationTime,
							};

							if (chunk.type === "tool_call") {
								chunkData = {
									type: "tool-call",
									toolName: chunk.metadata?.toolName || "unknown",
									toolCallId: chunk.metadata?.toolCallId || "unknown",
									args: JSON.parse(chunk.text),
									messageId,
									streamId,
									timestamp: chunk.createdAt || chunk._creationTime,
								};
							} else if (chunk.type === "tool_result") {
								chunkData = {
									type: "tool-result",
									toolName: chunk.metadata?.toolName || "unknown",
									toolCallId: chunk.metadata?.toolCallId || "unknown",
									result: JSON.parse(chunk.text),
									messageId,
									streamId,
									timestamp: chunk.createdAt || chunk._creationTime,
								};
							} else if (chunk.type === "error") {
								chunkData = {
									type: "error",
									error: chunk.text,
									messageId,
									streamId,
									timestamp: chunk.createdAt || chunk._creationTime,
								};
							}

							const line = `${JSON.stringify(chunkData)}\n`;
							controller.enqueue(encoder.encode(line));
						}

						// Check if stream is complete
						if (streamData.stream.status === "done") {
							const completionChunk = `${JSON.stringify({
								type: "completion",
								messageId,
								streamId,
								timestamp: Date.now(),
							})}\n`;
							controller.enqueue(encoder.encode(completionChunk));
							controller.close();
							return;
						}
						if (streamData.stream.status === "error") {
							const errorChunk = `${JSON.stringify({
								type: "error",
								error: streamData.stream.error || "Stream error",
								messageId,
								streamId,
								timestamp: Date.now(),
							})}\n`;
							controller.enqueue(encoder.encode(errorChunk));
							controller.close();
							return;
						}
						if (streamData.stream.status === "timeout") {
							const timeoutChunk = `${JSON.stringify({
								type: "error",
								error: "Stream timed out",
								messageId,
								streamId,
								timestamp: Date.now(),
							})}\n`;
							controller.enqueue(encoder.encode(timeoutChunk));
							controller.close();
							return;
						}

						// Continue polling if not done
						pollCount++;
						if (pollCount < maxPolls) {
							setTimeout(pollStream, pollInterval);
						} else {
							// Timeout after max polls
							const timeoutChunk = `${JSON.stringify({
								type: "error",
								error: "Polling timeout",
								messageId,
								streamId,
								timestamp: Date.now(),
							})}\n`;
							controller.enqueue(encoder.encode(timeoutChunk));
							controller.close();
						}
					} catch (error) {
						console.error("Polling error:", error);
						const errorChunk = `${JSON.stringify({
							type: "error",
							error: error instanceof Error ? error.message : "Unknown error",
							messageId,
							streamId,
							timestamp: Date.now(),
						})}\n`;
						controller.enqueue(encoder.encode(errorChunk));
						controller.close();
					}
				};

				// Start polling
				setTimeout(pollStream, pollInterval);
			},
		});

		return new Response(stream, {
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

				// Send all existing chunks immediately
				for (const chunk of streamData.chunks) {
					let chunkData: StreamChunk = {
						type: "text-delta",
						text: chunk.text,
						messageId: streamData.stream.messageId as Id<"messages">,
						streamId: streamData.stream._id,
						timestamp: chunk.createdAt || chunk._creationTime,
					};

					if (chunk.type === "tool_call") {
						chunkData = {
							type: "tool-call",
							toolName: (chunk.metadata?.toolName as string) || "unknown",
							toolCallId: (chunk.metadata?.toolCallId as string) || "unknown",
							args: JSON.parse(chunk.text),
							messageId: streamData.stream.messageId as Id<"messages">,
							streamId: streamData.stream._id,
							timestamp: chunk.createdAt || chunk._creationTime,
						};
					} else if (chunk.type === "tool_result") {
						chunkData = {
							type: "tool-result",
							toolName: (chunk.metadata?.toolName as string) || "unknown",
							toolCallId: (chunk.metadata?.toolCallId as string) || "unknown",
							result: JSON.parse(chunk.text),
							messageId: streamData.stream.messageId as Id<"messages">,
							streamId: streamData.stream._id,
							timestamp: chunk.createdAt || chunk._creationTime,
						};
					} else if (chunk.type === "error") {
						chunkData = {
							type: "error",
							error: chunk.text,
							messageId: streamData.stream.messageId as Id<"messages">,
							streamId: streamData.stream._id,
							timestamp: chunk.createdAt || chunk._creationTime,
						};
					}

					const line = `${JSON.stringify(chunkData)}\n`;
					controller.enqueue(encoder.encode(line));
				}

				// Send completion if stream is done
				if (streamData.stream.status === "done") {
					const completionChunk = `${JSON.stringify({
						type: "completion",
						timestamp: Date.now(),
					})}\n`;
					controller.enqueue(encoder.encode(completionChunk));
				} else if (streamData.stream.status === "error") {
					const errorChunk = `${JSON.stringify({
						type: "error",
						error: streamData.stream.error || "Stream error",
						timestamp: Date.now(),
					})}\n`;
					controller.enqueue(encoder.encode(errorChunk));
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
