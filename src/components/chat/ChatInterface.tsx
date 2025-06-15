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
      `🔥 processedMessages useMemo COMPLETE - returning ${result.length} messages`,
    )

    return result
  }, [messages, branchNavigation.currentBranch, branchNavigation.getMessagesForBranch, messageBranches])

  // Update message variants when processed messages change
  useEffect(() => {
    console.log(`🔥 useEffect (message variants) starting`)
    if (!processedMessages.length) {
      console.log(
        `🔥 useEffect (message variants) early return - no processed messages`,
      )
      return
    }

    const messageGroups = new Map<string, Message[]>()

    // Build groups using all messages (not just processed)
    for (const message of messages) {
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

    // Process each message group
    for (const [originalId, variants] of messageGroups) {
      if (variants.length <= 1) continue

      variants.sort((a, b) => (a.branchSequence || 0) - (b.branchSequence || 0))

      // Get current selection or default to latest
      const currentSelectedIndex =
        messageBranches[originalId] ?? variants.length - 1

      newMessageVariants.set(originalId, {
        variants,
        selected: currentSelectedIndex,
        total: variants.length,
      })
    }

    setMessageVariants(newMessageVariants)
    console.log(`🔥 useEffect (message variants) COMPLETE`)
  }, [messages, messageBranches])

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
      // For variants, we need to look up by the branchFromMessageId
      // For originals, we look up by the message's own ID
      const lookupKey = msg.branchFromMessageId || msg._id
      const variantInfo = messageVariants.get(lookupKey)

      // Check if this message is part of conversation-level branching
      const conversationBranchId = (
        msg as Message & { conversationBranchId?: string }
      ).conversationBranchId
      const isConversationBranchMessage =
        msg.branchFromMessageId && conversationBranchId !== "main"

      console.log(
        `📊 Message ${msg._id}: lookupKey=${lookupKey}, variantInfo=`,
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

      console.log(`[Branch Debug] Processing message ${msg._id}:`, {
        isConversationBranchMessage,
        variantInfo,
        hasNavigation: !!branchNavigation.getBranchNavigation(lookupKey),
        messageType: msg.messageType,
      })

      if (isConversationBranchMessage) {
        // For conversation branch messages, we need to look up navigation by the branch point
        // not the original message ID
        const branchPoint = (msg as Message & { branchPoint?: string })
          .branchPoint
        const navLookupId = branchPoint || lookupKey
        const navigation = branchNavigation.getBranchNavigation(navLookupId)

        console.log(
          `[Branch Debug] Conversation branch navigation for ${msg._id}:`,
          {
            navLookupId,
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
            `[Branch Debug] No navigation found for conversation branch message ${msg._id}`,
          )
        }
      } else if (variantInfo) {
        // Regular message-level branching
        branchInfo = {
          currentBranch: variantInfo.selected,
          totalBranches: variantInfo.total,
          onNavigate: (branchIndex: number) =>
            handleBranchNavigate(lookupKey, branchIndex),
        }
        console.log(
          "[Branch Debug] Created branchInfo for regular variant:",
          branchInfo,
        )
      } else {
        console.log(
          `[Branch Debug] No branch info created for message ${msg._id} - neither conversation branch nor variant`,
        )
      }

      // Final debug log for this message
      console.log(`[Branch Debug] Final state for message ${msg._id}:`, {
        hasBranchInfo: !!branchInfo,
        branchInfo,
        _branchInfo: branchInfo,
        messageType: msg.messageType,
        isConversationBranch: isConversationBranchMessage,
      })

      return {
        ...msg,
        _streamId: streamId || null,
        _originalMessageId: lookupKey,
        _branchInfo: branchInfo,
      }
    })
  }, [
    processedMessages,
    activeStreams,
    messageVariants,
    handleBranchNavigate,
    branchNavigation.getBranchNavigation,
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
