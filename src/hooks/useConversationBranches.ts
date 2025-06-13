"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Doc } from "../../convex/_generated/dataModel"

type Message = Doc<"messages">

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
      (msg) =>
        !(msg as Message & { conversationBranchId?: string })
          .conversationBranchId ||
        (msg as Message & { conversationBranchId?: string })
          .conversationBranchId === "main",
    )
    branches.set("main", {
      id: "main",
      name: "Original",
      messages: mainMessages,
      branchPoint: undefined,
    })

    // Step 3: Process retry branches
    for (const message of sortedMessages) {
      const conversationBranchId = (
        message as Message & { conversationBranchId?: string }
      ).conversationBranchId

      if (conversationBranchId && conversationBranchId !== "main") {
        if (!branches.has(conversationBranchId)) {
          // Find the branch point for this conversation branch
          let branchPoint = undefined
          if (message.branchFromMessageId) {
            const originalMessage = sortedMessages.find(
              (m) => m._id === message.branchFromMessageId,
            )
            if (originalMessage) {
              const originalPosition = mainMessages.findIndex(
                (m) => m._id === originalMessage._id,
              )
              branchPoint = {
                messageId: originalMessage._id,
                position: originalPosition,
              }

              // Track this branch at the branch point
              if (!branchPoints.has(originalMessage._id)) {
                branchPoints.set(originalMessage._id, [])
              }
              branchPoints.get(originalMessage._id)!.push(conversationBranchId)
            }
          }

          branches.set(conversationBranchId, {
            id: conversationBranchId,
            name: `Retry ${branches.size}`,
            messages: [],
            branchPoint,
          })
        }

        // Add message to this branch
        branches.get(conversationBranchId)!.messages.push(message)
      }
    }

    console.log("🌳 Conversation tree built:", {
      branches: Array.from(branches.keys()),
      branchPoints: Array.from(branchPoints.entries()),
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
        currentBranch === "main" &&
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
        // Main branch: return all main messages
        return branch.messages
      }
      // Retry branch: return inherited messages + branch messages
      const mainBranch = conversationTree.branches.find((b) => b.id === "main")
      if (!mainBranch || !branch.branchPoint) return branch.messages

      // Get messages from main branch that happened before the branch point
      const inheritedMessages = mainBranch.messages.slice(
        0,
        branch.branchPoint.position,
      )

      // Combine with branch-specific messages
      const allMessages = [...inheritedMessages, ...branch.messages]

      console.log(
        `🌳 Branch ${branchId}: ${inheritedMessages.length} inherited + ${branch.messages.length} new = ${allMessages.length} total`,
      )

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
      // Check if this message is a branch point
      const branchIds = conversationTree.branchPoints.get(messageId)
      if (!branchIds || branchIds.length === 0) return null

      // Create navigation for all branches that stem from this point
      const allBranchesAtPoint = ["main", ...branchIds]
      const currentIndex = allBranchesAtPoint.indexOf(currentBranch)

      return {
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
        totalBranches: allBranchesAtPoint.length,
        onNavigate: (index: number) => {
          const targetBranch = allBranchesAtPoint[index]
          if (targetBranch) {
            switchToBranch(targetBranch)
          }
        },
      }
    },
    [conversationTree.branchPoints, currentBranch, switchToBranch],
  )

  return {
    currentBranch,
    branches: conversationTree.branches,
    switchToBranch,
    getMessagesForBranch,
    getBranchNavigation,
  }
}
