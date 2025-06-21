"use client"

import { useChat } from "@/hooks/use-chat"
import { useResumableChat } from "@/hooks/use-resumable-stream"
import type { Preloaded } from "convex/react"
import { useEffect, useMemo, useRef } from "react"
import type { api } from "../../../convex/_generated/api"
import type { Doc } from "../../../convex/_generated/dataModel"
import { CenteredChatStart } from "./centered-chat-start"
import { ChatInput } from "./chat-input"
import { ChatMessages } from "./chat-messages"

type Message = Doc<"messages">

interface ChatInterfaceProps {
  preloadedThreadById?: Preloaded<typeof api.threads.get>
  preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>
  preloadedMessages?: Preloaded<typeof api.messages.list>
  preloadedUser?: Preloaded<typeof api.users.current>
  preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>
}

export function ChatInterface({
  preloadedThreadById,
  preloadedThreadByClientId,
  preloadedMessages,
  preloadedUser,
  preloadedUserSettings,
}: ChatInterfaceProps = {}) {
  // Use custom chat hook with optimistic updates and preloaded data
  const { messages, currentThread, handleSendMessage, isDisabled, isNewChat } =
    useChat({
      preloadedThreadById,
      preloadedThreadByClientId,
      preloadedMessages,
      preloadedUserSettings,
    })

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

  // Manage resumable streams - use thread ID as key to reset when changing chats
  const chatKey = currentThread?._id || (isNewChat ? "new" : "unknown")
  const { activeStreams, startStream, endStream } = useResumableChat(chatKey)

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
    // For new chats, only check if there are active messages streaming
    // Don't check currentThread?.isGenerating to avoid carrying over state from previous threads
    if (isNewChat) {
      return (
        messages.some((msg) => msg.isStreaming && !msg.isComplete) ||
        activeStreams.size > 0
      )
    }

    // For existing chats, check all conditions
    return (
      currentThread?.isGenerating ||
      messages.some((msg) => msg.isStreaming && !msg.isComplete) ||
      activeStreams.size > 0
    )
  }, [currentThread, messages, activeStreams, isNewChat])

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
        preloadedUser={preloadedUser}
      />
    )
  }

  return (
    <div className="flex flex-col h-full ">
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
