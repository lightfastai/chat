"use client"

import { useChat } from "@/hooks/useChat"
import { useResumableChat } from "@/hooks/useResumableStream"
import { useEffect, useMemo, useRef } from "react"
import type { Doc } from "../../../convex/_generated/dataModel"
import { CenteredChatStart } from "./CenteredChatStart"
import { ChatInput } from "./ChatInput"
import { ChatMessages } from "./ChatMessages"

type Message = Doc<"messages">

export function ChatInterface() {
  // Use custom chat hook with optimistic updates
  const { messages, currentThread, handleSendMessage, isDisabled, isNewChat } = useChat()

  // Track if user has ever sent a message to prevent flicker
  const hasEverSentMessage = useRef(false)
  
  // Reset when we're in a truly new chat, set when messages exist
  useEffect(() => {
    if (isNewChat && messages.length === 0) {
      hasEverSentMessage.current = false
    } else if (messages.length > 0) {
      hasEverSentMessage.current = true
    }
  }, [isNewChat, messages.length])

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

  // Check if AI is currently generating (any message is streaming or thread is generating)
  const isAIGenerating = useMemo(() => {
    return (
      currentThread?.isGenerating ||
      messages.some((msg) => msg.isStreaming && !msg.isComplete) ||
      activeStreams.size > 0
    )
  }, [currentThread, messages, activeStreams])

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

  // Show centered layout only for truly new chats that have never had messages
  if (isNewChat && !hasEverSentMessage.current) {
    return (
      <CenteredChatStart
        onSendMessage={handleSendMessage}
        disabled={isDisabled}
        isLoading={isAIGenerating}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ChatMessages messages={enhancedMessages} />
      <ChatInput
        onSendMessage={handleSendMessage}
        placeholder="Message AI assistant..."
        disabled={isDisabled}
        isLoading={isAIGenerating}
      />
    </div>
  )
}
