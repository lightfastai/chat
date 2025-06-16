"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Doc } from "../../convex/_generated/dataModel"
import type { ConversationTree } from "./useConversationTree"

type Message = Doc<"messages"> & {
  conversationBranchId?: string
  branchPoint?: string
}

export function useBranchNavigation(conversationTree: ConversationTree) {
  const [currentBranch, setCurrentBranch] = useState<string>("main")

  // Auto-switch to newest conversation branch when new branches are created
  const lastBranchCount = useRef(0)

  useEffect(() => {
    const currentBranchCount = conversationTree.branches.length

    console.log("🌳 Auto-switch check:", {
      currentBranchCount,
      lastBranchCount: lastBranchCount.current,
      currentBranch,
      branches: conversationTree.branches.map((b) => ({
        id: b.id,
        messageCount: b.messages.length,
      })),
    })

    // Only auto-switch when a NEW branch is created (branch count increased)
    if (
      currentBranchCount > lastBranchCount.current &&
      currentBranchCount > 1
    ) {
      const nonMainBranches = conversationTree.branches.filter(
        (b) => b.id !== "main",
      )

      if (nonMainBranches.length > 0) {
        // Extract timestamp from branch ID and sort numerically
        const branchesWithTimestamps = nonMainBranches.map((branch) => {
          // Extract timestamp from branch ID format: branch_{messageId}_{timestamp}_{suffix}
          const parts = branch.id.split("_")
          const timestamp =
            parts.length >= 3 ? Number.parseInt(parts[2], 10) || 0 : 0
          return { branch, timestamp }
        })

        // Sort by timestamp (newest first) and get the newest branch
        const newestBranch = branchesWithTimestamps.sort(
          (a, b) => b.timestamp - a.timestamp,
        )[0]?.branch

        if (
          newestBranch &&
          newestBranch.id !== currentBranch &&
          newestBranch.messages.length > 0
        ) {
          console.log(
            "🌳 Auto-switching to newest branch:",
            newestBranch.id,
            "from current:",
            currentBranch,
            "due to new branch creation",
          )
          setCurrentBranch(newestBranch.id)
        }
      }
    }

    lastBranchCount.current = currentBranchCount
  }, [conversationTree, currentBranch])

  // Switch to a specific branch
  const switchToBranch = useCallback((branchId: string) => {
    console.log("🌳 Switching to branch:", branchId)
    setCurrentBranch(branchId)
  }, [])

  // Get messages for a specific branch
  const getMessagesForBranch = useCallback(
    (branchId: string): Message[] => {
      console.log(`🌳 getMessagesForBranch called for: ${branchId}`)

      const branch = conversationTree.branches.find((b) => b.id === branchId)
      if (!branch) {
        console.log(`🌳 Branch ${branchId} not found in tree`)
        return []
      }

      console.log(`🌳 Found branch ${branchId}:`, {
        id: branch.id,
        messageCount: branch.messages.length,
        branchPoint: branch.branchPoint,
        messages: branch.messages.map((m) => ({
          id: m._id,
          type: m.messageType,
          body: m.body.substring(0, 20),
          branch: m.conversationBranchId || "main",
        })),
      })

      if (branchId === "main") {
        // Main branch: return only main messages
        console.log(
          `🌳 Returning main branch messages: ${branch.messages.length}`,
        )
        return branch.messages
      }

      // For conversation branches: return inherited messages + branch messages
      const mainBranch = conversationTree.branches.find((b) => b.id === "main")
      if (!mainBranch || !branch.branchPoint) {
        console.log(
          "🌳 No main branch or branch point, returning branch messages only",
        )
        return branch.messages
      }

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
      console.log("🌳 Branch point details:", {
        branchPointId: branch.branchPoint.messageId,
        position: branch.branchPoint.position,
        inheritedMessageIds: inheritedMessages.map((m) => ({
          id: m._id,
          type: m.messageType,
          body: m.body.substring(0, 20),
          branch: m.conversationBranchId || "main",
        })),
        branchMessageIds: branch.messages.map((m) => ({
          id: m._id,
          type: m.messageType,
          body: m.body.substring(0, 20),
          branch: m.conversationBranchId || "main",
        })),
      })

      const sortedMessages = allMessages.sort(
        (a, b) => a.timestamp - b.timestamp,
      )

      console.log(
        "🌳 Final sorted messages:",
        sortedMessages.map((m) => ({
          id: m._id,
          type: m.messageType,
          body: m.body.substring(0, 20),
          timestamp: m.timestamp,
        })),
      )

      return sortedMessages
    },
    [conversationTree],
  )

  return {
    currentBranch,
    switchToBranch,
    getMessagesForBranch,
  }
}
