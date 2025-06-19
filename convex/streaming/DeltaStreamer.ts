import type { GenericMutationCtx } from "convex/server"
import type { Infer } from "convex/values"
import type { Id } from "../_generated/dataModel"
import type { DataModel } from "../_generated/dataModel"
// import { internal } from "../_generated/api"
import type { streamPartValidator } from "./validators"
import { DEFAULT_STREAMING_OPTIONS } from "./validators"

type StreamPart = Infer<typeof streamPartValidator>

interface DeltaStreamerOptions {
  chunking?: "word" | "line" | "sentence"
  throttleMs?: number
}

/**
 * DeltaStreamer manages streaming text to the database with chunking and throttling
 * Based on Convex Agent SDK pattern but simplified for our use case
 */
export class DeltaStreamer {
  // private _ctx: GenericMutationCtx<DataModel>
  private streamId: Id<"streamingMessages">
  private options: Required<DeltaStreamerOptions>
  private pendingParts: StreamPart[] = []
  private cursor = 0
  private lastWriteTime = 0
  private writeTimeout?: NodeJS.Timeout
  private textBuffer = ""

  constructor(
    _ctx: GenericMutationCtx<DataModel>,
    streamId: Id<"streamingMessages">,
    options: DeltaStreamerOptions = {},
  ) {
    // this._ctx = ctx
    this.streamId = streamId
    this.options = {
      chunking: options.chunking ?? DEFAULT_STREAMING_OPTIONS.chunking,
      throttleMs: options.throttleMs ?? DEFAULT_STREAMING_OPTIONS.throttleMs,
    }
  }

  /**
   * Add text to the stream
   */
  async addText(text: string) {
    this.textBuffer += text

    // Chunk the text based on strategy
    const chunks = this.chunkText(this.textBuffer)

    // Keep the last incomplete chunk in the buffer
    if (chunks.length > 0) {
      // If we have multiple chunks, all but the last are complete
      if (chunks.length > 1) {
        const completeChunks = chunks.slice(0, -1)
        this.textBuffer = chunks[chunks.length - 1]

        for (const chunk of completeChunks) {
          this.pendingParts.push({
            type: "text-delta",
            textDelta: chunk,
          })
        }
      }
      // Otherwise, keep accumulating in the buffer
    }

    await this.scheduleWrite()
  }

  /**
   * Add a tool call to the stream
   */
  async addToolCall(toolCallId: string, toolName: string, args: any) {
    this.pendingParts.push({
      type: "tool-call",
      toolCallId,
      toolName,
      args,
    })
    await this.scheduleWrite()
  }

  /**
   * Add a tool result to the stream
   */
  async addToolResult(toolCallId: string, toolName: string, result: any) {
    this.pendingParts.push({
      type: "tool-result",
      toolCallId,
      toolName,
      result,
    })
    await this.scheduleWrite()
  }

  /**
   * Add thinking content to the stream
   */
  async addThinking(content: string) {
    this.pendingParts.push({
      type: "thinking",
      content,
    })
    await this.scheduleWrite()
  }

  /**
   * Finish the stream and write any remaining content
   */
  async finish() {
    // Flush any remaining text buffer
    if (this.textBuffer) {
      this.pendingParts.push({
        type: "text-delta",
        textDelta: this.textBuffer,
      })
      this.textBuffer = ""
    }

    // Cancel any pending write timeout
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout)
      this.writeTimeout = undefined
    }

    // Write any remaining parts
    if (this.pendingParts.length > 0) {
      await this.writeDelta()
    }

    // Mark stream as finished
    // TODO: Fix circular dependency
    // await this.ctx.runMutation(internal.streaming.finishStream, {
    //   streamId: this.streamId,
    // })
    console.log("Stream finished:", this.streamId)
  }

  /**
   * Mark stream as errored
   */
  async error(error: string) {
    // Cancel any pending operations
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout)
      this.writeTimeout = undefined
    }

    // Mark stream as errored
    // TODO: Fix circular dependency
    // await this.ctx.runMutation(internal.streaming.errorStream, {
    //   streamId: this.streamId,
    //   error,
    // })
    console.log("Stream errored:", this.streamId, error)
  }

  /**
   * Schedule a write based on throttling
   */
  private async scheduleWrite() {
    const now = Date.now()
    const timeSinceLastWrite = now - this.lastWriteTime

    if (timeSinceLastWrite >= this.options.throttleMs) {
      // Enough time has passed, write immediately
      await this.writeDelta()
    } else if (!this.writeTimeout) {
      // Schedule a write after the remaining throttle time
      const remainingTime = this.options.throttleMs - timeSinceLastWrite
      this.writeTimeout = setTimeout(async () => {
        this.writeTimeout = undefined
        await this.writeDelta()
      }, remainingTime)
    }
    // If a write is already scheduled, the pending parts will be included
  }

  /**
   * Write pending parts as a delta
   */
  private async writeDelta() {
    if (this.pendingParts.length === 0) return

    const parts = this.pendingParts
    this.pendingParts = []

    const start = this.cursor
    const end = start + parts.length

    // TODO: Fix circular dependency
    // await this.ctx.runMutation(internal.streaming.addDelta, {
    //   streamId: this.streamId,
    //   start,
    //   end,
    //   parts,
    // })
    console.log("Delta written:", this.streamId, start, end, parts.length)

    this.cursor = end
    this.lastWriteTime = Date.now()
  }

  /**
   * Chunk text based on the chunking strategy
   */
  private chunkText(text: string): string[] {
    if (!text) return []

    switch (this.options.chunking) {
      case "word": {
        // Split by word boundaries, keeping the delimiter
        const chunks = text.split(/(\s+)/)
        // Recombine alternating words and spaces
        const result: string[] = []
        let current = ""

        for (let i = 0; i < chunks.length; i++) {
          current += chunks[i]
          // Add to result after each word (odd indices)
          if (i % 2 === 0 && current) {
            result.push(current)
            current = ""
          }
        }

        // Add any remaining content
        if (current) {
          result.push(current)
        }

        return result
      }

      case "line":
        // Split by line breaks, keeping the delimiter
        return text.split(/(\n)/).filter(Boolean)

      case "sentence": {
        // Split by sentence boundaries (. ! ?)
        const chunks = text.split(/([.!?]+\s*)/)
        const result: string[] = []
        let current = ""

        for (const chunk of chunks) {
          current += chunk
          // If this chunk ends with sentence punctuation, it's complete
          if (/[.!?]\s*$/.test(chunk) && current) {
            result.push(current)
            current = ""
          }
        }

        // Add any remaining content
        if (current) {
          result.push(current)
        }

        return result
      }

      default:
        return [text]
    }
  }
}
