import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { createAIClient } from "./lib/ai_client";
import { streamText } from "ai";

export const streamChatResponse = httpAction(async (ctx, request) => {
  // Parse request body
  const body = await request.json();
  const { threadId, modelId, messages } = body;

  // Verify thread exists and user has access
  const thread = await ctx.runQuery(api.threads.get, { threadId });
  if (!thread) {
    return new Response("Thread not found", { status: 404 });
  }

  // Create initial AI message
  const messageId = await ctx.runMutation(internal.messages.create, {
    threadId,
    role: "assistant",
    body: "",
    modelId,
    isStreaming: true,
  });

  try {
    // Set up AI streaming
    const aiClient = createAIClient(modelId);
    const result = streamText({
      model: aiClient,
      messages,
      temperature: 0.7,
    });

    // Create HTTP streaming response with 200ms batching
    const stream = new ReadableStream({
      async start(controller) {
        let textBuffer = "";
        let lastBatchTime = Date.now();
        const BATCH_INTERVAL_MS = 200;
        const BATCH_SIZE_THRESHOLD = 50; // Characters

        const encoder = new TextEncoder();

        const flushBuffer = async () => {
          if (textBuffer.length > 0) {
            // Send to client immediately via HTTP stream
            const chunk = JSON.stringify({
              type: "text-delta",
              text: textBuffer,
              messageId,
              timestamp: Date.now(),
            }) + "\n";
            controller.enqueue(encoder.encode(chunk));

            // Batch update to database
            await ctx.runMutation(internal.messages.appendStreamingText, {
              messageId,
              text: textBuffer,
            });

            textBuffer = "";
            lastBatchTime = Date.now();
          }
        };

        try {
          for await (const part of result.fullStream) {
            if (part.type === "text") {
              textBuffer += part.text;

              const now = Date.now();
              const timeSinceLastBatch = now - lastBatchTime;

              // Flush buffer based on time interval or size threshold
              if (
                timeSinceLastBatch >= BATCH_INTERVAL_MS ||
                textBuffer.length >= BATCH_SIZE_THRESHOLD
              ) {
                await flushBuffer();
              }
            } else if (part.type === "finish") {
              // Flush any remaining buffer
              await flushBuffer();

              // Mark message as complete
              await ctx.runMutation(internal.messages.markComplete, {
                messageId,
              });

              // Send completion signal
              const completionChunk = JSON.stringify({
                type: "completion",
                messageId,
                timestamp: Date.now(),
              }) + "\n";
              controller.enqueue(encoder.encode(completionChunk));
            } else if (part.type === "error") {
              // Handle streaming errors
              const errorMessage = part.error instanceof Error ? part.error.message : "Unknown error";
              await ctx.runMutation(internal.messages.markError, {
                messageId,
                error: errorMessage,
              });

              const errorChunk = JSON.stringify({
                type: "error",
                messageId,
                error: errorMessage,
                timestamp: Date.now(),
              }) + "\n";
              controller.enqueue(encoder.encode(errorChunk));
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          
          // Mark message as errored
          await ctx.runMutation(internal.messages.markError, {
            messageId,
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
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("HTTP streaming setup error:", error);
    
    // Mark message as errored
    await ctx.runMutation(internal.messages.markError, {
      messageId,
      error: error instanceof Error ? error.message : "Setup error",
    });

    return new Response(
      JSON.stringify({ error: "Failed to start streaming" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});