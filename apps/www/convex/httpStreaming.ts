import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { createAIClient } from "./lib/ai_client";
import { streamText } from "ai";
import { Id } from "./_generated/dataModel";

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
    
    // Parse request body
    const body = await request.json();
    const { threadId, modelId, messages } = body;
    
    console.log("HTTP Streaming request:", { threadId, modelId, messageCount: messages?.length });

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
      modelId,
      isStreaming: true,
      streamId,
    });
    // Set up AI streaming
    const aiClient = createAIClient(modelId);
    const result = streamText({
      model: aiClient,
      messages,
      temperature: 0.7,
    });

    // Create HTTP streaming response with sentence-based batching
    const stream = new ReadableStream({
      async start(controller) {
        let textBuffer = "";
        let pendingBuffer = ""; // Buffer for incomplete sentences
        const SENTENCE_DELIMITERS = /[.!?\n]/;
        const MAX_BUFFER_SIZE = 200; // Max chars before forced flush
        
        // Stats for logging
        let chunkCount = 0;
        let totalChars = 0;
        const startTime = Date.now();

        const encoder = new TextEncoder();

        const flushBuffer = async (force = false) => {
          const toFlush = force ? textBuffer + pendingBuffer : textBuffer;
          
          if (toFlush.length > 0) {
            chunkCount++;
            console.log(`🔄 HTTP Streaming Chunk #${chunkCount}:`, {
              chunkSize: toFlush.length,
              type: force ? "forced" : "sentence",
              totalElapsed: Date.now() - startTime,
            });
            
            // Send to client immediately via HTTP stream
            const chunk = JSON.stringify({
              type: "text-delta",
              text: toFlush,
              messageId,
              streamId,
              timestamp: Date.now(),
            }) + "\n";
            controller.enqueue(encoder.encode(chunk));

            // Add chunk to database
            await ctx.runMutation(internal.streams.addChunk, {
              streamId,
              text: toFlush,
              type: "text",
            });

            textBuffer = "";
            if (force) {
              pendingBuffer = "";
            }
          }
        };

        try {
          for await (const part of result.fullStream) {
            if (part.type === "text") {
              pendingBuffer += part.text;
              totalChars += part.text.length;

              // Look for sentence boundaries
              let lastDelimiterIndex = -1;
              for (let i = 0; i < pendingBuffer.length; i++) {
                if (SENTENCE_DELIMITERS.test(pendingBuffer[i])) {
                  lastDelimiterIndex = i;
                }
              }

              // If we found a sentence boundary, move complete sentences to textBuffer
              if (lastDelimiterIndex !== -1) {
                textBuffer += pendingBuffer.substring(0, lastDelimiterIndex + 1);
                pendingBuffer = pendingBuffer.substring(lastDelimiterIndex + 1);
                await flushBuffer();
              }

              // Force flush if buffer is too large
              if (pendingBuffer.length >= MAX_BUFFER_SIZE) {
                textBuffer = pendingBuffer;
                pendingBuffer = "";
                await flushBuffer(true);
              }
            } else if (part.type === "tool-call") {
              // Flush any pending text first
              textBuffer = pendingBuffer;
              pendingBuffer = "";
              await flushBuffer(true);

              // Send tool call as a separate chunk
              const toolChunk = JSON.stringify({
                type: "tool-call",
                toolName: part.toolName,
                toolCallId: part.toolCallId,
                args: part.args,
                messageId,
                streamId,
                timestamp: Date.now(),
              }) + "\n";
              controller.enqueue(encoder.encode(toolChunk));

              // Store tool call in database
              await ctx.runMutation(internal.streams.addChunk, {
                streamId,
                text: JSON.stringify(part.args),
                type: "tool_call",
                metadata: {
                  toolName: part.toolName,
                  toolCallId: part.toolCallId,
                },
              });

            } else if (part.type === "tool-result") {
              // Send tool result
              const resultChunk = JSON.stringify({
                type: "tool-result",
                toolName: part.toolName,
                toolCallId: part.toolCallId,
                result: part.result,
                messageId,
                streamId,
                timestamp: Date.now(),
              }) + "\n";
              controller.enqueue(encoder.encode(resultChunk));

              // Store tool result
              await ctx.runMutation(internal.streams.addChunk, {
                streamId,
                text: JSON.stringify(part.result),
                type: "tool_result",
                metadata: {
                  toolName: part.toolName,
                  toolCallId: part.toolCallId,
                },
              });

            } else if (part.type === "finish") {
              // Flush any remaining text
              textBuffer = pendingBuffer;
              pendingBuffer = "";
              await flushBuffer(true);
              
              console.log("✅ HTTP Streaming Complete:", {
                totalChunks: chunkCount,
                totalChars,
                totalTime: Date.now() - startTime,
                avgChunkSize: totalChars / chunkCount,
              });

              // Mark stream as complete
              await ctx.runMutation(internal.streams.markComplete, {
                streamId,
              });

              // Send completion signal
              const completionChunk = JSON.stringify({
                type: "completion",
                messageId,
                streamId,
                timestamp: Date.now(),
              }) + "\n";
              controller.enqueue(encoder.encode(completionChunk));
            } else if (part.type === "error") {
              // Handle streaming errors
              const errorMessage = part.error instanceof Error ? part.error.message : "Unknown error";
              
              // Mark stream as errored
              await ctx.runMutation(internal.streams.markError, {
                streamId,
                error: errorMessage,
              });

              const errorChunk = JSON.stringify({
                type: "error",
                messageId,
                streamId,
                error: errorMessage,
                timestamp: Date.now(),
              }) + "\n";
              controller.enqueue(encoder.encode(errorChunk));
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          
          // Mark stream as errored
          await ctx.runMutation(internal.streams.markError, {
            streamId,
            error: error instanceof Error ? error.message : "Unknown error",
          });

          const errorChunk = JSON.stringify({
            type: "error",
            messageId,
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: Date.now(),
          }) + "\n";
          controller.enqueue(encoder.encode(errorChunk));
        } finally {
          controller.close();
        }
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
      }
    );
  }
});