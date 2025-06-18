import { useQuery } from "convex/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "../../convex/_generated/api"

interface UseResumableStreamOptions {
  streamId: string | null
  enabled?: boolean
  onComplete?: () => void
}

interface UseResumableStreamResult {
  streamingText: string
  isStreaming: boolean
  isComplete: boolean
  error: Error | null
}

export function useResumableStream({
  streamId,
  enabled = true,
  onComplete,
}: UseResumableStreamOptions): UseResumableStreamResult {
  const [streamingText, setStreamingText] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Track the last chunk ID we've seen
  const lastChunkIdRef = useRef<string | undefined>(undefined)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Query for new chunks since our last seen chunk
  const streamData = useQuery(
    api.messages.getStreamChunks,
    streamId && enabled
      ? {
          streamId,
          sinceChunkId: lastChunkIdRef.current,
        }
      : "skip",
  )

  // Process new chunks when they arrive
  useEffect(() => {
    if (!streamData) return

    const { chunks, isComplete: streamComplete, currentBody } = streamData

    if (chunks.length > 0) {
      // If we have new chunks, append them to our text
      const newContent = chunks
        .map((chunk: { content: string }) => chunk.content)
        .join("")
      setStreamingText((prev) => prev + newContent)

      // Update last chunk ID
      const lastChunk = chunks[chunks.length - 1]
      if (lastChunk) {
        lastChunkIdRef.current = lastChunk.id
      }

      setIsStreaming(true)
    } else if (streamComplete && !isComplete) {
      // If no new chunks but stream is complete, use the full body
      // This handles cases where we might have missed chunks
      setStreamingText(currentBody)
    }

    if (streamComplete && !isComplete) {
      setIsComplete(true)
      setIsStreaming(false)
      onComplete?.()
    }
  }, [streamData, isComplete, onComplete])

  // Reset state when streamId changes
  useEffect(() => {
    if (streamId) {
      setStreamingText("")
      setIsStreaming(false)
      setIsComplete(false)
      setError(null)
      lastChunkIdRef.current = undefined
    }
  }, [streamId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    streamingText,
    isStreaming,
    isComplete,
    error,
  }
}

// Optional: Hook for managing multiple resumable streams in a chat
export function useResumableChat(chatKey?: string) {
  const [activeStreams, setActiveStreams] = useState<Map<string, string>>(
    new Map(),
  )

  // Reset active streams when chat key changes
  useEffect(() => {
    setActiveStreams(new Map())
  }, [chatKey])

  const startStream = useCallback((messageId: string, streamId: string) => {
    setActiveStreams((prev) => new Map(prev).set(messageId, streamId))
  }, [])

  const endStream = useCallback((messageId: string) => {
    setActiveStreams((prev) => {
      const next = new Map(prev)
      next.delete(messageId)
      return next
    })
  }, [])

  const clearAllStreams = useCallback(() => {
    setActiveStreams(new Map())
  }, [])

  return {
    activeStreams,
    startStream,
    endStream,
    clearAllStreams,
  }
}
