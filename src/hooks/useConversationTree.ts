"use client"

import { useMemo } from "react"
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

export interface ConversationTree {
  branches: ConversationBranch[]
  branchPoints: Map<string, string[]>
}

export function useConversationTree(messages: Message[]): ConversationTree {
  return useMemo(() => {
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
        // Use the branchPoint field for conversation-level branching
        const branchPointId = message.branchPoint

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
}
