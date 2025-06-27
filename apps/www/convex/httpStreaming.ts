import type { FunctionReturnType } from "convex/server";
import type { Infer } from "convex/values";
import type { ModelId } from "../src/lib/ai/schemas";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import type { 
	httpStreamingRequestValidator,
	StreamEnvelope,
	MessagePart,
} from "./validators";

// Types from validators
type StreamWithChunks = NonNullable<
	FunctionReturnType<typeof internal.streams.getStreamWithChunks>
>;
type HTTPStreamingRequest = Infer<typeof httpStreamingRequestValidator>;

// Helper to convert database chunks to message parts
function chunkToMessagePart(chunk: StreamWithChunks["chunks"][0]): MessagePart | null {
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

				// Send initial stream-start event
				const startEnvelope: StreamEnvelope = {
					streamId,
					messageId,
					sequence: 0,
					timestamp: Date.now(),
					event: {
						type: "stream-start",
						metadata: { modelId },
					},
				};
				const startChunk = {
					type: "content",
					envelope: startEnvelope,
				};
				controller.enqueue(encoder.encode(`${JSON.stringify(startChunk)}\n`));

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
							
							const part = chunkToMessagePart(chunk);
							if (part) {
								const envelope: StreamEnvelope = {
									streamId,
									messageId,
									sequence: lastChunkIndex,
									timestamp: chunk.createdAt || chunk._creationTime,
									part,
								};
								
								const streamChunk = {
									type: "content",
									envelope,
								};
								
								controller.enqueue(encoder.encode(`${JSON.stringify(streamChunk)}\n`));
							}
						}

						// Check if stream is complete
						if (streamData.stream.status === "done") {
							const endEnvelope: StreamEnvelope = {
								streamId,
								messageId,
								sequence: lastChunkIndex + 1,
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
							controller.close();
							return;
						}
						
						if (streamData.stream.status === "error" || streamData.stream.status === "timeout") {
							const errorEnvelope: StreamEnvelope = {
								streamId,
								messageId,
								sequence: lastChunkIndex + 1,
								timestamp: Date.now(),
								event: {
									type: "stream-error",
									error: streamData.stream.error || 
										(streamData.stream.status === "timeout" ? "Stream timed out" : "Stream error"),
									code: streamData.stream.status,
								},
							};
							const errorChunk = {
								type: "content",
								envelope: errorEnvelope,
							};
							controller.enqueue(encoder.encode(`${JSON.stringify(errorChunk)}\n`));
							controller.close();
							return;
						}

						// Continue polling if not done
						pollCount++;
						if (pollCount < maxPolls) {
							setTimeout(pollStream, pollInterval);
						} else {
							// Timeout after max polls
							const timeoutEnvelope: StreamEnvelope = {
								streamId,
								messageId,
								sequence: lastChunkIndex + 1,
								timestamp: Date.now(),
								event: {
									type: "stream-error",
									error: "Polling timeout",
									code: "polling_timeout",
								},
							};
							const timeoutChunk = {
								type: "content",
								envelope: timeoutEnvelope,
							};
							controller.enqueue(encoder.encode(`${JSON.stringify(timeoutChunk)}\n`));
							controller.close();
						}
					} catch (error) {
						console.error("Polling error:", error);
						const errorEnvelope: StreamEnvelope = {
							streamId,
							messageId,
							sequence: lastChunkIndex + 1,
							timestamp: Date.now(),
							event: {
								type: "stream-error",
								error: error instanceof Error ? error.message : "Unknown error",
								code: "polling_error",
							},
						};
						const errorChunk = {
							type: "content",
							envelope: errorEnvelope,
						};
						controller.enqueue(encoder.encode(`${JSON.stringify(errorChunk)}\n`));
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
						
						controller.enqueue(encoder.encode(`${JSON.stringify(streamChunk)}\n`));
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
