"use client"

import { useChat } from "@/hooks/useChat"
import { useConversationBranches } from "@/hooks/useConversationBranches"
import { useResumableChat } from "@/hooks/useResumableStream"
import { useMutation } from "convex/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { api } from "../../../convex/_generated/api"
import type { Doc, Id } from "../../../convex/_generated/dataModel"
import { ChatInput } from "./ChatInput"
import { ChatMessages } from "./ChatMessages"

type Message = Doc<"messages"> & {
  conversationBranchId?: string
  branchPoint?: string
}

export function ChatInterface() {
  console.log(`🔥 ChatInterface render`)

  // REMOVED: editingMessageId - not needed for conversation-level branching

  // State for retry operations to prevent rapid clicking
  const [retryingMessageIds, setRetryingMessageIds] = useState<Set<string>>(
    new Set(),
  )

  // Use custom chat hook with optimistic updates
  const {
    messages,
    handleSendMessage: baseSendMessage,
    emptyState,
    isDisabled,
    currentThread,
  } = useChat()

  // Use conversation branches hook for clean branch management
  const branchNavigation = useConversationBranches(messages)

  // Track previous branch to detect changes
  const prevBranchRef = useRef(branchNavigation.currentBranch)

  // Wrapper function to pass current conversation branch context
  const handleSendMessage = useCallback(
    (message: string, modelId: string) => {
      console.log(
        `🔧 ChatInterface.handleSendMessage: Sending to branch ${branchNavigation.currentBranch}`,
      )
      return baseSendMessage(message, modelId, branchNavigation.currentBranch)
    },
    [baseSendMessage, branchNavigation.currentBranch],
  )

  console.log(`🔥 State:`, {
    messagesCount: messages.length,
    currentBranch: branchNavigation.currentBranch,
    branchCount: branchNavigation.branches.length,
  })

  // Conversation branch mutation
  const createConversationBranch = useMutation(
    api.conversationBranches.createConversationBranch,
  )

  // Get messages for current branch using the clean hook
  const processedMessages = useMemo(() => {
    console.log(`🔥 processedMessages useMemo starting`)
    console.log("🎯 Raw messages from database:", messages.length)

    // Get messages for the current conversation branch
    const branchMessages = branchNavigation.getMessagesForBranch(
      branchNavigation.currentBranch,
    )

    console.log(
      `🎯 Branch ${branchNavigation.currentBranch}: ${branchMessages.length} messages`,
    )

    if (!branchMessages.length) {
      console.log(`🔥 processedMessages useMemo: no messages, returning empty`)
      return []
    }

    // For conversation-level branching, we just return the branch messages directly
    // Sort by timestamp for display (desc - newest first)
    const result = [...branchMessages].sort((a, b) => b.timestamp - a.timestamp)

    console.log(
      `🔥 processedMessages useMemo COMPLETE - returning ${result.length} messages`,
    )

    return result
  }, [
    messages,
    branchNavigation.currentBranch,
    branchNavigation.getMessagesForBranch,
  ])

  // Reset when conversation branch changes
  useEffect(() => {
    if (prevBranchRef.current !== branchNavigation.currentBranch) {
      console.log(
        `🔄 Conversation branch changed from ${prevBranchRef.current} to ${branchNavigation.currentBranch}`,
      )
      prevBranchRef.current = branchNavigation.currentBranch
    }
  }, [branchNavigation.currentBranch])

  // REMOVED: User message editing - not part of conversation-level branching
  // REMOVED: Legacy branch handler - not needed for conversation-level branching

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

  // Enhance messages with streaming text and branch info
  const enhancedMessages = useMemo(() => {
    console.log("📊 Processing enhanced messages:")
    console.log("📊 processedMessages count:", processedMessages.length)

    return processedMessages.map((msg: Message) => {
      const streamId = activeStreams.get(msg._id)

      // Check if this message should show branch navigation
      let branchInfo = undefined

      const navigation = branchNavigation.getBranchNavigation(msg._id)
      if (navigation) {
        branchInfo = {
          currentBranch: navigation.currentIndex,
          totalBranches: navigation.totalBranches,
          onNavigate: navigation.onNavigate,
        }
        console.log(
          `[Branch Debug] Added branch navigation for message ${msg._id}:`,
          branchInfo,
        )
      }

      return {
        ...msg,
        _streamId: streamId || null,
        _originalMessageId: msg._id,
        _branchInfo: branchInfo,
        _isRetrying: retryingMessageIds.has(msg._id),
      }
    })
  }, [
    processedMessages,
    activeStreams,
    branchNavigation.getBranchNavigation,
    retryingMessageIds,
  ])

  // Handle retrying assistant messages - defined after enhancedMessages
  const handleRetry = useCallback(
    async (messageId: string) => {
      console.log("🔄 Retry button clicked for message:", messageId)

      // Edge case protection: Check if already retrying this message
      if (retryingMessageIds.has(messageId)) {
        console.log(
          "⚠️ Already retrying this message, ignoring duplicate request",
        )
        return
      }

      if (!currentThread) {
        console.log("❌ No current thread available")
        return
      }

      // Edge case protection: Don't retry streaming messages
      const message = messages.find((m) => m._id === messageId)
      if (message?.isStreaming && !message?.isComplete) {
        console.log("⚠️ Cannot retry streaming message")
        return
      }

      // Edge case protection: Don't retry if thread is already generating
      if (currentThread?.isGenerating) {
        console.log("⚠️ Thread is already generating, cannot retry now")
        return
      }

      // CONVERSATION-LEVEL BRANCHING: Simply retry this specific message
      // No need to trace back to root - each retry creates a new conversation branch

      console.log("🔍 Conversation-level retry:", {
        messageId: messageId,
        currentBranch: branchNavigation.currentBranch,
      })

      // Mark message as being retried
      setRetryingMessageIds((prev) => new Set([...prev, messageId]))

      try {
        console.log("🚀 Creating conversation branch for message:", messageId)
        // Create a new conversation branch by retrying this message
        const result = await createConversationBranch({
          threadId: currentThread._id,
          assistantMessageId: messageId as Id<"messages">,
        })
        console.log("✅ Branch creation successful:", result)
      } catch (error) {
        console.error("❌ Error creating assistant message branch:", error)
        // Could show user-friendly error message here
      } finally {
        // Always remove from retrying set
        setRetryingMessageIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(messageId)
          return newSet
        })
      }
    },
    [
      currentThread,
      createConversationBranch,
      branchNavigation.currentBranch,
      retryingMessageIds,
      messages,
    ],
  )

  console.log(
    `🔥 ChatInterface RENDERING with ${enhancedMessages.length} enhanced messages`,
  )

  return (
    <div className="flex flex-col h-full">
      <ChatMessages
        messages={enhancedMessages}
        emptyState={emptyState}
        onRetry={handleRetry}
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
