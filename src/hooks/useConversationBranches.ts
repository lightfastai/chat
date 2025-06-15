"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Doc } from "../../convex/_generated/dataModel"

type Message = Doc<"messages"> & {
  conversationBranchId?: string
  branchPoint?: string
}

export interface ConversationBranch {
  id: string
  name: string
  messages: Message[]
  branchPoint?: {
    messageId: string
    position: number
  }
}

export interface ConversationBranchNavigation {
  currentBranch: string
  branches: ConversationBranch[]
  switchToBranch: (branchId: string) => void
  getMessagesForBranch: (branchId: string) => Message[]
  getBranchNavigation: (messageId: string) => {
    currentIndex: number
    totalBranches: number
    onNavigate: (index: number) => void
  } | null
}

export function useConversationBranches(
  messages: Message[],
): ConversationBranchNavigation {
  const [currentBranch, setCurrentBranch] = useState<string>("main")
  const [lastAutoSwitchBranch, setLastAutoSwitchBranch] = useState<
    string | null
  >(null)

  // Build conversation tree from messages
  const conversationTree = useMemo(() => {
    console.log(
      "🌳 Building conversation tree from",
      messages.length,
      "messages",
    )

    if (!messages.length) {
      return {
        branches: [
          {
            id: "main",
            name: "Original",
            messages: [],
            branchPoint: undefined,
          },
        ],
        branchPoints: new Map<string, string[]>(),
      }
    }

    // Step 1: Sort all messages by timestamp to get chronological order
    const sortedMessages = [...messages].sort(
      (a, b) => a.timestamp - b.timestamp,
    )

    // Step 2: Identify conversation branches and their relationships
    const branches = new Map<string, ConversationBranch>()
    const branchPoints = new Map<string, string[]>() // originalMessageId -> [branchIds]

    // Initialize main branch
    const mainMessages = sortedMessages.filter(
      (msg) => !msg.conversationBranchId || msg.conversationBranchId === "main",
    )
    branches.set("main", {
      id: "main",
      name: "Original",
      messages: mainMessages,
      branchPoint: undefined,
    })

    // Step 3: First pass - identify all conversation branches and their branch points
    // This ensures we track ALL branches before processing messages
    const branchInfoMap = new Map<
      string,
      { branchPoint: string | null; conversationBranchId: string }
    >()

    for (const message of sortedMessages) {
      const conversationBranchId = message.conversationBranchId

      if (conversationBranchId && conversationBranchId !== "main") {
        // Use the branchPoint field if available, otherwise use branchFromMessageId
        const branchPointId = message.branchPoint || message.branchFromMessageId

        if (branchPointId && !branchInfoMap.has(conversationBranchId)) {
          branchInfoMap.set(conversationBranchId, {
            branchPoint: branchPointId,
            conversationBranchId: conversationBranchId,
          })

          // Track this branch at its branch point
          if (!branchPoints.has(branchPointId)) {
            branchPoints.set(branchPointId, [])
          }
          if (
            !branchPoints.get(branchPointId)!.includes(conversationBranchId)
          ) {
            branchPoints.get(branchPointId)!.push(conversationBranchId)
          }

          console.log(
            `🌳 Pre-tracking branch point: messageId=${branchPointId}, conversationBranchId=${conversationBranchId}`,
          )
        }
      }
    }

    // Step 4: Process messages and assign to branches
    for (const message of sortedMessages) {
      const conversationBranchId = message.conversationBranchId

      if (conversationBranchId && conversationBranchId !== "main") {
        if (!branches.has(conversationBranchId)) {
          // Get branch info from our pre-processed map
          const branchInfo = branchInfoMap.get(conversationBranchId)
          let branchPoint = undefined

          if (branchInfo?.branchPoint) {
            const branchPointId = branchInfo.branchPoint

            // Find position in main messages
            const originalPosition = mainMessages.findIndex(
              (m) => m._id === branchPointId,
            )

            branchPoint = {
              messageId: branchPointId,
              position: originalPosition >= 0 ? originalPosition : 0,
            }
          }

          branches.set(conversationBranchId, {
            id: conversationBranchId,
            name: `Retry ${branches.size}`, // branches.size = 1 for first retry, 2 for second, etc.
            messages: [],
            branchPoint,
          })
        }

        // Add message to this branch
        branches.get(conversationBranchId)!.messages.push(message)
      }
    }

    console.log("🌳 Conversation tree built:", {
      branches: Array.from(branches.entries()).map(([id, branch]) => ({
        id,
        messageCount: branch.messages.length,
        branchPoint: branch.branchPoint,
      })),
      branchPoints: Array.from(branchPoints.entries()).map(
        ([messageId, branchIds]) => ({
          messageId,
          branches: [...branchIds],
        }),
      ),
      totalMessages: messages.length,
    })

    return {
      branches: Array.from(branches.values()),
      branchPoints,
    }
  }, [messages])

  // Auto-switch to newest conversation branch
  useEffect(() => {
    if (conversationTree.branches.length <= 1) return

    // Find the newest non-main branch that we haven't auto-switched to yet
    const nonMainBranches = conversationTree.branches.filter(
      (b) => b.id !== "main",
    )

    if (nonMainBranches.length > 0) {
      // Sort by branch ID (which contains timestamp) to get newest
      const newestBranch = nonMainBranches
        .sort((a, b) => a.id.localeCompare(b.id))
        .pop()

      if (
        newestBranch &&
        newestBranch.id !== currentBranch &&
        newestBranch.id !== lastAutoSwitchBranch &&
        newestBranch.messages.length > 0
      ) {
        console.log("🌳 Auto-switching to newest branch:", newestBranch.id)
        setCurrentBranch(newestBranch.id)
        setLastAutoSwitchBranch(newestBranch.id)
      }
    }
  }, [conversationTree, currentBranch, lastAutoSwitchBranch])

  // Get messages for a specific branch
  const getMessagesForBranch = useCallback(
    (branchId: string): Message[] => {
      const branch = conversationTree.branches.find((b) => b.id === branchId)
      if (!branch) return []

      if (branchId === "main") {
        // Main branch: return only main messages
        return branch.messages
      }

      // For conversation branches: return inherited messages + branch messages
      const mainBranch = conversationTree.branches.find((b) => b.id === "main")
      if (!mainBranch || !branch.branchPoint) return branch.messages

      // Get messages from main branch that happened before the branch point (inclusive)
      const inheritedMessages = mainBranch.messages.slice(
        0,
        branch.branchPoint.position + 1,
      )

      // Combine with branch-specific messages
      const allMessages = [...inheritedMessages, ...branch.messages]

      console.log(
        `🌳 Branch ${branchId}: ${inheritedMessages.length} inherited + ${branch.messages.length} new = ${allMessages.length} total`,
      )
      console.log(`🌳 Branch point details:`, {
        branchPointId: branch.branchPoint.messageId,
        position: branch.branchPoint.position,
        inheritedMessageIds: inheritedMessages.map((m) => ({
          id: m._id,
          type: m.messageType,
          body: m.body.substring(0, 20),
        })),
        branchMessageIds: branch.messages.map((m) => ({
          id: m._id,
          type: m.messageType,
          body: m.body.substring(0, 20),
        })),
      })

      return allMessages.sort((a, b) => a.timestamp - b.timestamp)
    },
    [conversationTree],
  )

  // Switch to a specific branch
  const switchToBranch = useCallback((branchId: string) => {
    console.log("🌳 Switching to branch:", branchId)
    setCurrentBranch(branchId)
  }, [])

  // Get branch navigation for a specific message
  const getBranchNavigation = useCallback(
    (messageId: string) => {
      // For conversation-level branching, show navigation on ASSISTANT messages that have been retried
      // We need to find if this assistant message has variants (retries)
      
      // First, check if this message has variants (direct retries of this message)
      const allMessages = conversationTree.branches.flatMap(b => b.messages)
      const hasDirectRetries = allMessages.some(msg => msg.branchFromMessageId === messageId)
      
      // Also check if this message is itself a retry (has branchFromMessageId)
      const currentMessage = allMessages.find(msg => msg._id === messageId)
      const isRetry = currentMessage?.branchFromMessageId
      
      // CRITICAL: Only show navigation if this specific message has actual variants
      // Don't show navigation just because there are other retries in the conversation
      if (hasDirectRetries || isRetry) {
        // Find the root original message to get all variants
        let rootOriginalId = messageId
        if (isRetry) {
          // Trace back to find root original
          let current = currentMessage
          while (current?.branchFromMessageId) {
            const parent = allMessages.find(m => m._id === current.branchFromMessageId)
            if (!parent) break
            current = parent
            rootOriginalId = current._id
          }
        }
        
        // Find all conversation branches that contain variants of the root original
        const variantBranches = conversationTree.branches.filter(branch => {
          return branch.messages.some(msg => 
            msg._id === rootOriginalId || msg.branchFromMessageId === rootOriginalId
          )
        })
        
        if (variantBranches.length > 1) {
          const branchIds = variantBranches.map(b => b.id)
          const currentIndex = branchIds.indexOf(currentBranch)

          console.log("🌳 Assistant message branch navigation:", {
            messageId,
            rootOriginalId,
            hasDirectRetries,
            isRetry,
            variantBranches: branchIds,
            currentBranch,
            currentIndex,
          })

          return {
            currentIndex: currentIndex >= 0 ? currentIndex : 0,
            totalBranches: branchIds.length,
            onNavigate: (index: number) => {
              const targetBranch = branchIds[index]
              console.log(
                `🌳 Navigating to conversation branch ${index}: ${targetBranch}`,
              )
              if (targetBranch) {
                switchToBranch(targetBranch)
              }
            },
          }
        }
      }

      return null
    },
    [
      conversationTree.branches,
      currentBranch,
      switchToBranch,
    ],
  )

  return useMemo(
    () => ({
      currentBranch,
      branches: conversationTree.branches,
      switchToBranch,
      getMessagesForBranch,
      getBranchNavigation,
    }),
    [
      currentBranch,
      conversationTree.branches,
      switchToBranch,
      getMessagesForBranch,
      getBranchNavigation,
    ],
  )
}
