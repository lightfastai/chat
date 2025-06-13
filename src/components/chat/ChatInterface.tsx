"use client"

import { useChat } from "@/hooks/useChat"
import { useResumableChat } from "@/hooks/useResumableStream"
import { useMutation } from "convex/react"
import { nanoid } from "nanoid"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"
import { api } from "../../../convex/_generated/api"
import type { Doc, Id } from "../../../convex/_generated/dataModel"
import { ChatInput } from "./ChatInput"
import { ChatMessages } from "./ChatMessages"
import { ThreadBreadcrumb } from "./ThreadBreadcrumb"

type Message = Doc<"messages">

export function ChatInterface() {
  // Use custom chat hook with optimistic updates
  const {
    messages,
    handleSendMessage,
    emptyState,
    isDisabled,
    currentThread,
  } = useChat()

  // Router for navigation
  const router = useRouter()

  // Mutation for creating branch
  const createBranch = useMutation(api.threads.createBranch)

  // Handle branching from a message
  const handleBranch = useCallback(
    async (messageId: string) => {
      if (!currentThread?._id) return

      try {
        const clientId = nanoid()
        const newThreadId = await createBranch({
          parentThreadId: currentThread._id,
          branchFromMessageId: messageId as Id<"messages">,
          title: "Branched conversation",
          clientId,
        })

        // Navigate to the new branched thread
        router.push(`/chat/${newThreadId}`)
      } catch (error) {
        console.error("Failed to create branch:", error)
      }
    },
    [currentThread?._id, createBranch, router],
  )

  // Manage resumable streams
  const { activeStreams, startStream, endStream } = useResumableChat()

  // Track streaming messages
  const streamingMessages = useMemo(() => {
    return messages.filter((msg: Message) => msg.isStreaming && msg.streamId)
  }, [messages])

  // Set up streams for streaming messages
  useEffect(() => {
    for (const msg of streamingMessages) {
      if (msg.streamId && !activeStreams.has(msg._id)) {
        startStream(msg._id, msg.streamId)
      }
    }

    // Clean up completed streams
    for (const msg of messages) {
      if (!msg.isStreaming && activeStreams.has(msg._id)) {
        endStream(msg._id)
      }
    }
  }, [streamingMessages, messages, activeStreams, startStream, endStream])

  // Check if AI is currently generating (any message is streaming)
  const isAIGenerating = useMemo(() => {
    return (
      messages.some((msg) => msg.isStreaming && !msg.isComplete) ||
      activeStreams.size > 0
    )
  }, [messages, activeStreams])

  // Enhance messages with streaming text
  const enhancedMessages = useMemo(() => {
    return messages.map((msg: Message) => {
      const streamId = activeStreams.get(msg._id)
      return {
        ...msg,
        _streamId: streamId || null,
      }
    })
  }, [messages, activeStreams])

  return (
    <div className="flex flex-col h-full">
      <ThreadBreadcrumb thread={currentThread} />
      <ChatMessages
        messages={enhancedMessages}
        emptyState={emptyState}
        onBranch={handleBranch}
      />
      <ChatInput
        onSendMessage={handleSendMessage}
        placeholder="Message AI assistant..."
        disabled={isDisabled}
        isLoading={isAIGenerating}
      />
    </div>
  )
}
