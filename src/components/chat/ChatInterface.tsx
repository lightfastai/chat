"use client"

import { useChat } from "@/hooks/useChat"
import { useResumableChat } from "@/hooks/useResumableStream"
import { useMutation } from "convex/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "../../../convex/_generated/api"
import type { Doc } from "../../../convex/_generated/dataModel"
import { ChatInput } from "./ChatInput"
import { ChatMessages } from "./ChatMessages"

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

  // State for editing messages
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  
  // Branch mutations
  const createUserMessageBranch = useMutation(api.branches.createUserMessageBranch)
  const createAssistantMessageBranch = useMutation(api.branches.createAssistantMessageBranch)

  // Handle editing user messages
  const handleStartEdit = useCallback((messageId: string) => {
    setEditingMessageId(messageId)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
  }, [])

  const handleEdit = useCallback(
    async (messageId: string, newContent: string) => {
      if (!currentThread) return
      
      try {
        // Create a new branch with the edited content
        await createUserMessageBranch({
          threadId: currentThread._id,
          originalMessageId: messageId as any, // Type cast for Convex ID
          newContent,
        })
        setEditingMessageId(null)
      } catch (error) {
        console.error("Error creating user message branch:", error)
      }
    },
    [currentThread, createUserMessageBranch],
  )

  // Handle retrying assistant messages
  const handleRetry = useCallback(
    async (messageId: string) => {
      if (!currentThread) return
      
      try {
        // Create a new branch by retrying the assistant response
        await createAssistantMessageBranch({
          threadId: currentThread._id,
          originalMessageId: messageId as any, // Type cast for Convex ID
        })
      } catch (error) {
        console.error("Error creating assistant message branch:", error)
      }
    },
    [currentThread, createAssistantMessageBranch],
  )

  // Legacy branch handler (to be removed)
  const handleBranch = useCallback(
    async (messageId: string) => {
      console.log("Legacy branch functionality", messageId)
    },
    [],
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
      <ChatMessages
        messages={enhancedMessages}
        emptyState={emptyState}
        onBranch={handleBranch}
        onEdit={handleEdit}
        onRetry={handleRetry}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        editingMessageId={editingMessageId || undefined}
      />
      <ChatInput
        onSendMessage={handleSendMessage}
        placeholder="Message AI assistant..."
        disabled={isDisabled || editingMessageId !== null}
        isLoading={isAIGenerating}
      />
    </div>
  )
}
