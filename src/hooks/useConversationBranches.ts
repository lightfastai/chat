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

  // Check if we're currently viewing a branched conversation
  const isInBranchedConversation = useCallback(() => {
    return currentBranch !== "main" || conversationTree.branches.length > 1
  }, [currentBranch, conversationTree.branches])

  // Get branch navigation for a specific message
  const getBranchNavigation = useCallback(
    (messageId: string) => {
      // If we're in a branched conversation, show navigation for all messages
      if (isInBranchedConversation() && conversationTree.branches.length > 1) {
        // Get all branch IDs
        const allBranches = conversationTree.branches.map((b) => b.id)
        const currentIndex = allBranches.indexOf(currentBranch)

        console.log("🌳 Universal branch navigation:", {
          messageId,
          branches: allBranches,
          currentBranch,
          currentIndex,
        })

        return {
          currentIndex: currentIndex >= 0 ? currentIndex : 0,
          totalBranches: allBranches.length,
          onNavigate: (index: number) => {
            const targetBranch = allBranches[index]
            console.log(`🌳 Navigating to branch ${index}: ${targetBranch}`)
            if (targetBranch) {
              switchToBranch(targetBranch)
            }
          },
        }
      }

      // Original logic: Check if this message is a branch point
      const branchIds = conversationTree.branchPoints.get(messageId)
      console.log(`🌳 getBranchNavigation for ${messageId}:`, {
        branchIds: branchIds ? [...branchIds] : "none",
        allBranchPoints: Array.from(
          conversationTree.branchPoints.entries(),
        ).map(([id, branches]) => ({
          messageId: id,
          branches: [...branches],
        })),
        currentBranch,
      })

      if (!branchIds || branchIds.length === 0) {
        console.log(
          `🌳 No branch navigation for ${messageId} - not a branch point`,
        )
        return null
      }

      // Create navigation for all branches that stem from this point
      const allBranchesAtPoint = ["main", ...branchIds]
      const currentIndex = allBranchesAtPoint.indexOf(currentBranch)

      console.log("🌳 Branch navigation created:", {
        messageId,
        branches: allBranchesAtPoint,
        currentBranch,
        currentIndex,
      })

      return {
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
        totalBranches: allBranchesAtPoint.length,
        onNavigate: (index: number) => {
          const targetBranch = allBranchesAtPoint[index]
          console.log(`🌳 Navigating to branch ${index}: ${targetBranch}`)
          if (targetBranch) {
            switchToBranch(targetBranch)
          }
        },
      }
    },
    [conversationTree.branchPoints, conversationTree.branches, currentBranch, switchToBranch, isInBranchedConversation],
  )

  return {
    currentBranch,
    branches: conversationTree.branches,
    switchToBranch,
    getMessagesForBranch,
    getBranchNavigation,
  }
}
