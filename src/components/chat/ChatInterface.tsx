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

let renderCount = 0

export function ChatInterface() {
  renderCount++
  const currentRender = renderCount
  console.log(`🔥 RENDER ${currentRender} - ChatInterface starting`)

  // State for editing messages
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [messageBranches, setMessageBranches] = useState<
    Record<string, number>
  >({}) // messageId -> selected branch index for backward compatibility

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

  // State to track message variants for branch navigation
  const [messageVariants, setMessageVariants] = useState<
    Map<string, { variants: Message[]; selected: number; total: number }>
  >(new Map())

  console.log(`🔥 RENDER ${currentRender} - State:`, {
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
    console.log(
      `🔥 RENDER ${currentRender} - processedMessages useMemo starting`,
    )
    console.log("🎯 Raw messages from database:", messages.length)

    // Get messages for the current conversation branch
    const branchMessages = branchNavigation.getMessagesForBranch(
      branchNavigation.currentBranch,
    )

    console.log(
      `🎯 Branch ${branchNavigation.currentBranch}: ${branchMessages.length} messages`,
    )

    if (!branchMessages.length) {
      console.log(
        `🔥 RENDER ${currentRender} - processedMessages useMemo: no messages, returning empty`,
      )
      return []
    }

    // Handle message-level variants within the branch
    const messageGroups = new Map<string, Message[]>()

    // Group messages by their branch relationships
    for (const message of messages) {
      if (!message.branchFromMessageId) {
        // Original message
        if (!messageGroups.has(message._id)) {
          messageGroups.set(message._id, [])
        }
        messageGroups.get(message._id)!.push(message)
      } else {
        // Branch variant
        const originalId = message.branchFromMessageId
        if (!messageGroups.has(originalId)) {
          messageGroups.set(originalId, [])
        }
        messageGroups.get(originalId)!.push(message)
      }
    }

    // Build the final message list with selected variants
    const result: Message[] = []

    // Get all original messages from branch messages, sorted by timestamp
    const originalMessages = branchMessages
      .filter((msg) => !msg.branchFromMessageId)
      .sort((a, b) => a.timestamp - b.timestamp)

    console.log(
      "🔍 Found",
      originalMessages.length,
      "original messages in branch",
    )

    for (const originalMessage of originalMessages) {
      const variants = messageGroups.get(originalMessage._id) || []

      if (variants.length === 0) {
        console.log(`🔍 No variants found for ${originalMessage._id}, skipping`)
        continue
      }

      variants.sort((a, b) => (a.branchSequence || 0) - (b.branchSequence || 0))

      // Select variant (auto-select latest for new branches)
      const selectedIndex =
        messageBranches[originalMessage._id] ?? variants.length - 1
      const selectedMessage =
        variants[selectedIndex] || variants[variants.length - 1]

      console.log(
        `🔍 Selected variant ${selectedIndex}/${variants.length} for ${originalMessage._id}:`,
        selectedMessage._id,
      )

      result.push(selectedMessage)
    }

    // Also include conversation branch messages that don't have message-level variants
    const branchMessages2 = branchMessages.filter(
      (msg) =>
        msg.branchFromMessageId && !result.find((r) => r._id === msg._id),
    )

    console.log(
      "🔍 Found",
      branchMessages2.length,
      "conversation branch messages to add",
    )
    result.push(...branchMessages2)

    // Sort by timestamp for display (desc - newest first)
    result.sort((a, b) => b.timestamp - a.timestamp)

    console.log(
      `🔥 RENDER ${currentRender} - processedMessages useMemo COMPLETE - returning ${result.length} messages`,
    )

    return result
  }, [messages, branchNavigation, messageBranches])

  // Update message variants when processed messages change
  // TEMPORARILY DISABLED to fix infinite loop - needs refactoring
  useEffect(() => {
    // TODO: Re-enable message variants logic after fixing circular dependencies
    // The logic below was causing infinite re-renders due to:
    // processedMessages -> messageVariants -> messageBranches -> processedMessages
    return
  }, [processedMessages])

  /*
  // Original message variants logic (disabled)
  useEffect(() => {
    console.log(
      `🔥 RENDER ${currentRender} - useEffect (message variants) starting`,
    )
    if (!processedMessages.length) {
      console.log(
        `🔥 RENDER ${currentRender} - useEffect (message variants) early return - no processed messages`,
      )
      return
    }

    const messageGroups = new Map<string, Message[]>()

    // Build groups using processedMessages (already filtered by conversation branch)
    // This ensures consistency between what we process and what we display
    for (const message of processedMessages) {
      if (!message.branchFromMessageId) {
        if (!messageGroups.has(message._id)) {
          messageGroups.set(message._id, [])
        }
        messageGroups.get(message._id)!.push(message)
      } else {
        const originalId = message.branchFromMessageId
        if (!messageGroups.has(originalId)) {
          messageGroups.set(originalId, [])
        }
        messageGroups.get(originalId)!.push(message)
      }
    }

    const newMessageVariants = new Map<
      string,
      { variants: Message[]; selected: number; total: number }
    >()
    const updatedMessageBranches = { ...messageBranches }

    // Only process original messages (not branches) from processedMessages
    const originalMessages = processedMessages.filter(
      (msg) => !msg.branchFromMessageId,
    )

    for (const originalMessage of originalMessages) {
      const variants = messageGroups.get(originalMessage._id) || []
      if (variants.length === 0) continue

      variants.sort((a, b) => (a.branchSequence || 0) - (b.branchSequence || 0))

      // Auto-select the latest branch variant (highest sequence number)
      // This ensures newly created branches are automatically shown
      const currentSelectedIndex = messageBranches[originalMessage._id]
      let selectedIndex = currentSelectedIndex

      // If no selection exists, or if we have new variants, select the latest one
      if (
        currentSelectedIndex === undefined ||
        variants.length >
          (newMessageVariants.get(originalMessage._id)?.total || 0)
      ) {
        selectedIndex = variants.length - 1 // Select the newest variant
        updatedMessageBranches[originalMessage._id] = selectedIndex
        console.log(
          `🎯 Auto-selecting newest variant for ${originalMessage._id}: index ${selectedIndex}/${variants.length}`,
        )
      } else {
        selectedIndex = currentSelectedIndex
      }

      if (variants.length > 1) {
        newMessageVariants.set(originalMessage._id, {
          variants,
          selected: selectedIndex,
          total: variants.length,
        })
      }
    }

    // Update messageBranches if we auto-selected new variants
    if (
      JSON.stringify(updatedMessageBranches) !== JSON.stringify(messageBranches)
    ) {
      setMessageBranches(updatedMessageBranches)
    }

    setMessageVariants(newMessageVariants)
    console.log(
      `🔥 RENDER ${currentRender} - useEffect (message variants) COMPLETE`,
    )
  }, [processedMessages])
  */

  // Auto-switching is now handled by the useConversationBranches hook

  // Reset message-level branch state when conversation branch changes
  useEffect(() => {
    if (prevBranchRef.current !== branchNavigation.currentBranch) {
      console.log(
        `🔄 Conversation branch changed from ${prevBranchRef.current} to ${branchNavigation.currentBranch}, resetting message branches`,
      )
      setMessageBranches({})
      setMessageVariants(new Map())
      prevBranchRef.current = branchNavigation.currentBranch
    }
  }, [branchNavigation.currentBranch])

  // Handle branch navigation for a specific message
  const handleBranchNavigate = useCallback(
    (originalMessageId: string, branchIndex: number) => {
      setMessageBranches((prev) => ({
        ...prev,
        [originalMessageId]: branchIndex,
      }))
    },
    [],
  )

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
    console.log("📊 messageVariants size:", messageVariants.size)
    console.log(
      "📊 messageVariants entries:",
      Array.from(messageVariants.entries()),
    )

    return processedMessages.map((msg: Message) => {
      const streamId = activeStreams.get(msg._id)

      // Find the original message ID for branch navigation
      const originalMessageId = msg.branchFromMessageId || msg._id
      const variantInfo = messageVariants.get(originalMessageId)

      // Check if this message is part of conversation-level branching
      const conversationBranchId = (
        msg as Message & { conversationBranchId?: string }
      ).conversationBranchId
      const isConversationBranchMessage =
        msg.branchFromMessageId && conversationBranchId !== "main"

      console.log(
        `📊 Message ${msg._id}: originalId=${originalMessageId}, variantInfo=`,
        variantInfo,
        "isConversationBranch=",
        isConversationBranchMessage,
        "branchFromMessageId=",
        msg.branchFromMessageId,
        "conversationBranchId=",
        conversationBranchId,
      )

      // For conversation branch messages, create conversation-level navigation
      let branchInfo = undefined

      console.log(`[Branch Debug] Processing message ${originalMessageId}:`, {
        isConversationBranchMessage,
        variantInfo,
        hasNavigation:
          !!branchNavigation.getBranchNavigation(originalMessageId),
        messageType: msg.messageType,
      })

      if (isConversationBranchMessage) {
        // For conversation branch messages, we need to look up navigation by the branch point
        // not the original message ID
        const branchPoint = (msg as Message & { branchPoint?: string })
          .branchPoint
        const lookupId = branchPoint || originalMessageId
        const navigation = branchNavigation.getBranchNavigation(lookupId)

        console.log(
          `[Branch Debug] Conversation branch navigation for ${originalMessageId}:`,
          {
            lookupId,
            branchPoint,
            navigation,
            exists: !!navigation,
            currentIndex: navigation?.currentIndex,
            totalBranches: navigation?.totalBranches,
          },
        )

        if (navigation) {
          branchInfo = {
            currentBranch: navigation.currentIndex,
            totalBranches: navigation.totalBranches,
            onNavigate: navigation.onNavigate,
          }
          console.log(
            "[Branch Debug] Created branchInfo for conversation branch:",
            branchInfo,
          )
        } else {
          console.log(
            `[Branch Debug] No navigation found for conversation branch message ${originalMessageId}`,
          )
        }
      } else if (variantInfo) {
        // Regular message-level branching
        branchInfo = {
          currentBranch: variantInfo.selected,
          totalBranches: variantInfo.total,
          onNavigate: (branchIndex: number) =>
            handleBranchNavigate(originalMessageId, branchIndex),
        }
        console.log(
          "[Branch Debug] Created branchInfo for regular variant:",
          branchInfo,
        )
      } else {
        console.log(
          `[Branch Debug] No branch info created for message ${originalMessageId} - neither conversation branch nor variant`,
        )
      }

      // Final debug log for this message
      console.log(
        `[Branch Debug] Final state for message ${originalMessageId}:`,
        {
          hasBranchInfo: !!branchInfo,
          branchInfo,
          _branchInfo: branchInfo,
          messageType: msg.messageType,
          isConversationBranch: isConversationBranchMessage,
        },
      )

      return {
        ...msg,
        _streamId: streamId || null,
        _originalMessageId: originalMessageId,
        _branchInfo: branchInfo,
      }
    })
  }, [
    processedMessages,
    activeStreams,
    messageVariants,
    handleBranchNavigate,
    branchNavigation,
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
      if (!currentThread) {
        console.log("❌ No current thread available")
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
      }
    },
    [currentThread, createAssistantMessageBranch, findRootOriginal],
  )

  console.log(
    `🔥 RENDER ${currentRender} - ChatInterface RENDERING with ${enhancedMessages.length} enhanced messages`,
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
