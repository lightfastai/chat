import type { FunctionReturnType } from "convex/server";
import type { Infer } from "convex/values";
import type { ModelId } from "../src/lib/ai/schemas";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { streamAIText } from "./streamAIText";
import { HybridStreamWriter } from "./hybridStreamWriter";
import type {
  MessagePart,
  StreamEnvelope,
  httpStreamingRequestValidator,
} from "./validators";

// Types from validators
type StreamWithChunks = NonNullable<
	FunctionReturnType<typeof internal.streams.getStreamWithChunks>
>;
type HTTPStreamingRequest = Infer<typeof httpStreamingRequestValidator>;

// Helper to convert database chunks to message parts
function chunkToMessagePart(
	chunk: StreamWithChunks["chunks"][0],
): MessagePart | null {
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
		const { threadId, modelId, messages, options } = body;

		console.log("HTTP Streaming request:", {
			threadId,
			modelId,
			messageCount: messages?.length,
			useExistingMessage: options?.useExistingMessage,
			resumeFromStreamId: options?.resumeFromStreamId,
		});

		// Verify thread exists and user has access
		const thread = await ctx.runQuery(api.threads.get, { threadId });
		if (!thread) {
			return new Response("Thread not found", { status: 404 });
		}

		let streamId: Id<"streams">;
		let messageId: Id<"messages">;

		// Use existing stream and message for hybrid streaming, or create new ones
		if (options?.resumeFromStreamId && options?.useExistingMessage) {
			// Hybrid streaming mode - use existing structures
			streamId = options.resumeFromStreamId;
			messageId = options.useExistingMessage;

			console.log("Using existing stream and message for hybrid streaming:", {
				streamId,
				messageId,
			});
		} else {
			// Regular HTTP streaming mode - create new structures
			streamId = await ctx.runMutation(internal.streams.create, {
				userId: thread.userId,
				metadata: { threadId, modelId },
			});

			messageId = await ctx.runMutation(internal.messages.create, {
				threadId,
				messageType: "assistant",
				body: "",
				modelId: modelId as ModelId,
				isStreaming: true,
				streamId,
			});

			console.log("Created new stream and message:", {
				streamId,
				messageId,
			});
		}

		// For hybrid streaming, we handle AI generation directly in the HTTP endpoint
		// This ensures single AI generation with dual writing (HTTP + database)

		// Get user's API keys for AI generation
		const userApiKeys = (await ctx.runMutation(
			internal.userSettings.getDecryptedApiKeys,
			{ userId: thread.userId },
		)) as {
			anthropic?: string;
			openai?: string;
			openrouter?: string;
		} | null;

		// Create HTTP streaming response using HybridStreamWriter
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Create hybrid writer for direct streaming
					const writer = new HybridStreamWriter(
						ctx,
						messageId,
						streamId,
						controller,
					);

					// Send stream start event
					await writer.sendStreamStart({ modelId });

					// Run AI generation inline with direct HybridStreamWriter access
					// This keeps the writer in the same execution context, solving the global state issue
					await streamAIText(ctx, {
						threadId,
						messageId,
						streamId,
						modelId: modelId as ModelId,
						hybridWriter: writer,
						userApiKeys: userApiKeys || undefined,
						webSearchEnabled: options?.webSearchEnabled ?? false,
					});

					// AI generation completes and writer is automatically cleaned up
				} catch (error) {
					console.error("Stream setup error:", error);
					const writer = new HybridStreamWriter(
						ctx,
						messageId,
						streamId,
						controller,
					);
					await writer.handleError(
						error instanceof Error ? error.message : "Stream setup failed",
						"setup_error",
					);
				}
			},

			// Handle client disconnection
			cancel(reason) {
				console.log(
					`HTTP connection cancelled for stream ${streamId}:`,
					reason,
				);
				// The inline execution means the writer will be garbage collected
				// and database writes will complete naturally in the background
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

						controller.enqueue(
							encoder.encode(`${JSON.stringify(streamChunk)}\n`),
						);
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
