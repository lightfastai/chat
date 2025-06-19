import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"
import { streamArgsValidator } from "./validators"

// Query to sync streams for a thread
export const syncStreams = query({
  args: {
    threadId: v.id("threads"),
    streamArgs: streamArgsValidator,
  },
  returns: v.union(
    // List of active streams
    v.object({
      kind: v.literal("list"),
      messages: v.array(
        v.object({
          streamId: v.string(),
          order: v.number(),
          stepOrder: v.number(),
          state: v.union(
            v.object({
              kind: v.literal("streaming"),
              lastHeartbeat: v.number(),
            }),
            v.object({ kind: v.literal("finished"), endedAt: v.number() }),
            v.object({ kind: v.literal("error"), error: v.string() }),
          ),
        }),
      ),
    }),
    // Deltas for requested streams
    v.object({
      kind: v.literal("deltas"),
      deltas: v.array(
        v.object({
          streamId: v.string(),
          start: v.number(),
          end: v.number(),
          parts: v.array(
            v.union(
              v.object({
                type: v.literal("text-delta"),
                textDelta: v.string(),
              }),
              v.object({
                type: v.literal("tool-call"),
                toolCallId: v.string(),
                toolName: v.string(),
                args: v.any(),
              }),
              v.object({
                type: v.literal("tool-result"),
                toolCallId: v.string(),
                toolName: v.string(),
                result: v.any(),
              }),
              v.object({
                type: v.literal("thinking"),
                content: v.string(),
              }),
            ),
          ),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return args.streamArgs.kind === "list"
        ? { kind: "list" as const, messages: [] }
        : { kind: "deltas" as const, deltas: [] }
    }

    // Verify user has access to the thread
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return args.streamArgs.kind === "list"
        ? { kind: "list" as const, messages: [] }
        : { kind: "deltas" as const, deltas: [] }
    }

    if (args.streamArgs.kind === "list") {
      // Return list of active streaming messages
      const streamingMessages = await ctx.db
        .query("streamingMessages")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .collect()

      return {
        kind: "list" as const,
        messages: streamingMessages.map((msg) => ({
          streamId: msg.streamId,
          order: msg.order,
          stepOrder: msg.stepOrder,
          state: msg.state,
        })),
      }
    } else {
      // Return deltas for requested streams
      const deltas = []

      for (const { streamId, cursor } of args.streamArgs.cursors) {
        // Find the streaming message
        const streamingMessage = await ctx.db
          .query("streamingMessages")
          .withIndex("by_stream_id", (q) => q.eq("streamId", streamId))
          .first()

        if (!streamingMessage || streamingMessage.threadId !== args.threadId) {
          continue
        }

        // Get deltas after the cursor
        const streamDeltas = await ctx.db
          .query("streamDeltas")
          .withIndex("by_stream", (q) => q.eq("streamId", streamingMessage._id))
          .collect()

        // Filter to deltas after the cursor and transform
        for (const delta of streamDeltas) {
          if (delta.start >= cursor) {
            deltas.push({
              streamId,
              start: delta.start,
              end: delta.end,
              parts: delta.parts,
            })
          }
        }
      }

      return {
        kind: "deltas" as const,
        deltas,
      }
    }
  },
})
