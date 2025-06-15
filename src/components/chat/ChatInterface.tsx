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

  // State for editing messages
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)

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
    editingMessageId,
  })

  // Branch mutations
  const createUserMessageBranch = useMutation(
    api.branches.createUserMessageBranch,
  )
  const createAssistantMessageBranch = useMutation(
    api.branches.createAssistantMessageBranch,
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
          originalMessageId: messageId as Id<"messages">, // Type cast for Convex ID
          newContent,
        })
        setEditingMessageId(null)
      } catch (error) {
        console.error("Error creating user message branch:", error)
      }
    },
    [currentThread, createUserMessageBranch],
  )

  // Legacy branch handler (to be removed)
  const handleBranch = useCallback(async (messageId: string) => {
    console.log("Legacy branch functionality", messageId)
  }, [])

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

  // Find root original message by tracing back through branchFromMessageId chain
  const findRootOriginal = useCallback(
    (messageId: string): string => {
      const message = enhancedMessages.find((m) => m._id === messageId)
      if (!message) return messageId

      // If this message has a branchFromMessageId, it's a variant
      // Keep tracing back to find the root original
      const messageWithBranch = message as Message & {
        branchFromMessageId?: string
      }
      if (messageWithBranch.branchFromMessageId) {
        return findRootOriginal(messageWithBranch.branchFromMessageId)
      }

      return messageId
    },
    [enhancedMessages],
  )

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

      // CRITICAL FIX: Always find the root original message
      // This handles "retry of retry" correctly
      const rootOriginalId = findRootOriginal(messageId)

      console.log("🔍 Retry details:", {
        clickedMessageId: messageId,
        rootOriginalId: rootOriginalId,
        isRetryOfRetry: rootOriginalId !== messageId,
      })

      // Mark message as being retried
      setRetryingMessageIds((prev) => new Set([...prev, messageId]))

      try {
        console.log(
          "🚀 Creating assistant message branch for ROOT ORIGINAL:",
          rootOriginalId,
        )
        // Create a new branch by retrying the ROOT ORIGINAL response
        const result = await createAssistantMessageBranch({
          threadId: currentThread._id,
          originalMessageId: rootOriginalId as Id<"messages">, // Use ROOT original message ID
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
      createAssistantMessageBranch,
      findRootOriginal,
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
