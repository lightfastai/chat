import { v } from "convex/values"
import { internalMutation } from "./_generated/server"
import { streamPartValidator } from "./streaming/validators"

// Internal mutation to create a streaming message
export const createStreamingMessage = internalMutation({
  args: {
    threadId: v.id("threads"),
    streamId: v.string(),
    userId: v.optional(v.id("users")),
    model: v.optional(v.string()),
    modelId: v.optional(v.string()),
    order: v.number(),
    stepOrder: v.number(),
  },
  returns: v.id("streamingMessages"),
  handler: async (ctx, args) => {
    const streamingMessageId = await ctx.db.insert("streamingMessages", {
      threadId: args.threadId,
      streamId: args.streamId,
      userId: args.userId,
      model: args.model as any, // Will be validated by schema
      modelId: args.modelId as any, // Will be validated by schema
      order: args.order,
      stepOrder: args.stepOrder,
      state: {
        kind: "streaming",
        lastHeartbeat: Date.now(),
      },
    })

    return streamingMessageId
  },
})

// Internal mutation to add a delta
export const addDelta = internalMutation({
  args: {
    streamId: v.id("streamingMessages"),
    start: v.number(),
    end: v.number(),
    parts: v.array(streamPartValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify the stream exists and is still streaming
    const stream = await ctx.db.get(args.streamId)
    if (!stream || stream.state.kind !== "streaming") {
      console.warn(
        `Attempted to add delta to non-streaming message: ${args.streamId}`,
      )
      return null
    }

    // Update heartbeat
    await ctx.db.patch(args.streamId, {
      state: {
        kind: "streaming",
        lastHeartbeat: Date.now(),
      },
    })

    // Insert the delta
    await ctx.db.insert("streamDeltas", {
      streamId: args.streamId,
      start: args.start,
      end: args.end,
      parts: args.parts,
    })

    return null
  },
})

// Internal mutation to finish a stream
export const finishStream = internalMutation({
  args: {
    streamId: v.id("streamingMessages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.streamId)
    if (!stream) return null

    const now = Date.now()
    await ctx.db.patch(args.streamId, {
      state: {
        kind: "finished",
        endedAt: now,
      },
      // Schedule cleanup in 5 minutes
      cleanupAt: now + 5 * 60 * 1000,
    })

    return null
  },
})

// Internal mutation to mark a stream as errored
export const errorStream = internalMutation({
  args: {
    streamId: v.id("streamingMessages"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.streamId)
    if (!stream) return null

    await ctx.db.patch(args.streamId, {
      state: {
        kind: "error",
        error: args.error,
      },
      // Schedule cleanup in 5 minutes
      cleanupAt: Date.now() + 5 * 60 * 1000,
    })

    return null
  },
})

// Internal mutation to cleanup old streams
export const cleanupStreams = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now()

    // Find streams that need cleanup
    const streamsToCleanup = await ctx.db
      .query("streamingMessages")
      .withIndex("by_cleanup", (q) => q.lt("cleanupAt", now))
      .collect()

    for (const stream of streamsToCleanup) {
      // Delete all deltas for this stream
      const deltas = await ctx.db
        .query("streamDeltas")
        .withIndex("by_stream", (q) => q.eq("streamId", stream._id))
        .collect()

      for (const delta of deltas) {
        await ctx.db.delete(delta._id)
      }

      // Delete the stream itself
      await ctx.db.delete(stream._id)
    }

    return null
  },
})

// Internal mutation to convert streaming message to regular message
export const convertStreamToMessage = internalMutation({
  args: {
    streamId: v.id("streamingMessages"),
    threadId: v.id("threads"),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.streamId)
    if (!stream) {
      throw new Error(`Stream not found: ${args.streamId}`)
    }

    // Get all deltas for this stream
    const deltas = await ctx.db
      .query("streamDeltas")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .collect()

    // Sort deltas by start position
    deltas.sort((a, b) => a.start - b.start)

    // Reconstruct the message body from deltas
    let body = ""
    let thinkingContent = ""
    let hasThinking = false

    for (const delta of deltas) {
      for (const part of delta.parts) {
        if (part.type === "text-delta") {
          body += part.textDelta
        } else if (part.type === "thinking") {
          thinkingContent += part.content
          hasThinking = true
        }
        // Tool calls and results are handled separately in the future
      }
    }

    // Create the regular message
    const messageId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      body,
      timestamp: stream._creationTime,
      messageType: "assistant",
      model: stream.model,
      modelId: stream.modelId,
      isStreaming: false,
      isComplete: true,
      streamId: stream.streamId,
      thinkingContent: hasThinking ? thinkingContent : undefined,
      hasThinkingContent: hasThinking,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        reasoningTokens: 0,
        cachedInputTokens: 0,
      },
    })

    return messageId
  },
})
