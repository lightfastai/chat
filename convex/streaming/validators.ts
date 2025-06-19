import { type Infer, v } from "convex/values"

// Stream part types - based on Convex Agent SDK
export const streamPartValidator = v.union(
  // Text delta
  v.object({
    type: v.literal("text-delta"),
    textDelta: v.string(),
  }),
  // Tool call
  v.object({
    type: v.literal("tool-call"),
    toolCallId: v.string(),
    toolName: v.string(),
    args: v.any(),
  }),
  // Tool result
  v.object({
    type: v.literal("tool-result"),
    toolCallId: v.string(),
    toolName: v.string(),
    result: v.any(),
  }),
  // Thinking/reasoning content
  v.object({
    type: v.literal("thinking"),
    content: v.string(),
  }),
)

// Stream state validator
export const streamStateValidator = v.union(
  v.object({ kind: v.literal("streaming"), lastHeartbeat: v.number() }),
  v.object({ kind: v.literal("finished"), endedAt: v.number() }),
  v.object({ kind: v.literal("error"), error: v.string() }),
)

// Stream args for syncStreams query
export const streamArgsValidator = v.union(
  // List active streams
  v.object({
    kind: v.literal("list"),
  }),
  // Get deltas for streams
  v.object({
    kind: v.literal("deltas"),
    cursors: v.array(
      v.object({
        streamId: v.string(),
        cursor: v.number(),
      }),
    ),
  }),
)

// Streaming options
export const streamingOptionsValidator = v.object({
  // Chunking strategy
  chunking: v.optional(
    v.union(v.literal("word"), v.literal("line"), v.literal("sentence")),
  ),
  // Throttle in milliseconds
  throttleMs: v.optional(v.number()),
})

// Default streaming options
export const DEFAULT_STREAMING_OPTIONS = {
  chunking: "word" as const,
  throttleMs: 250,
}

// Type exports
export type StreamPart = Infer<typeof streamPartValidator>
