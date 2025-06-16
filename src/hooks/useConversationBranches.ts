"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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

  // Auto-switch to newest conversation branch (only when first created)
  const hasAutoSwitched = useRef(false)
  
  useEffect(() => {
    if (conversationTree.branches.length <= 1) return

    // Find the newest non-main branch by parsing timestamps from branch IDs
    const nonMainBranches = conversationTree.branches.filter(
      (b) => b.id !== "main",
    )

    if (nonMainBranches.length > 0) {
      // Extract timestamp from branch ID and sort numerically
      const branchesWithTimestamps = nonMainBranches.map(branch => {
        // Extract timestamp from branch ID format: branch_{messageId}_{timestamp}_{suffix}
        const parts = branch.id.split('_')
        const timestamp = parts.length >= 3 ? parseInt(parts[2], 10) || 0 : 0
        return { branch, timestamp }
      })

      // Sort by timestamp (newest first) and get the newest branch
      const newestBranch = branchesWithTimestamps
        .sort((a, b) => b.timestamp - a.timestamp)[0]?.branch

      // Only auto-switch if:
      // 1. There's a newest branch
      // 2. It's not already the current branch
      // 3. It has messages
      // 4. We haven't auto-switched before (prevent fighting with manual navigation)
      if (
        newestBranch &&
        newestBranch.id !== currentBranch &&
        newestBranch.messages.length > 0 &&
        !hasAutoSwitched.current
      ) {
        console.log("🌳 Auto-switching to newest branch:", newestBranch.id, 
                   "from current:", currentBranch)
        setCurrentBranch(newestBranch.id)
        hasAutoSwitched.current = true
      }
    }
  }, [conversationTree, currentBranch])

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
      console.log("🌳 Branch point details:", {
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

  // Get branch navigation for message-level variants
  const getBranchNavigation = useCallback(
    (messageId: string) => {
      // MESSAGE-LEVEL VARIANT NAVIGATION:
      // Show navigation for messages that have multiple versions (retries)
      // This shows variants of the same message, not conversation branches

      const targetMessage = messages.find(m => m._id === messageId)
      if (!targetMessage || targetMessage.messageType !== "assistant") {
        return null
      }
      
      // Find the user message that prompted this assistant response
      let userMessage = null
      
      console.log("🔍 Finding user message for assistant:", {
        messageId,
        hasBranchPoint: !!targetMessage.branchPoint,
        branchPoint: targetMessage.branchPoint,
        conversationBranch: targetMessage.conversationBranchId || "main"
      })
      
      if (targetMessage.branchPoint) {
        // This is a retry message - find the user message it branches from
        userMessage = messages.find(m => m._id === targetMessage.branchPoint)
        console.log("🔍 Found user message via branchPoint:", userMessage ? {
          id: userMessage._id,
          body: userMessage.body.substring(0, 20),
          type: userMessage.messageType
        } : "NOT FOUND")
      } else {
        // This is an original message - find the previous user message in the same branch
        const candidates = messages
          .filter(m => 
            m.messageType === "user" && 
            m.timestamp < targetMessage.timestamp &&
            (m.conversationBranchId || "main") === (targetMessage.conversationBranchId || "main")
          )
          .sort((a, b) => b.timestamp - a.timestamp)
        
        console.log("🔍 User message candidates:", candidates.map(c => ({
          id: c._id,
          body: c.body.substring(0, 20),
          timestamp: c.timestamp,
          branch: c.conversationBranchId || "main"
        })))
        
        userMessage = candidates[0]
        console.log("🔍 Selected user message:", userMessage ? {
          id: userMessage._id,
          body: userMessage.body.substring(0, 20)
        } : "NOT FOUND")
      }
      
      if (!userMessage) {
        console.log("🔍 No user message found, returning null")
        return null
      }
      
      // Find all assistant messages that are responses to this user message:
      // 1. The original response (look across all branches)
      // 2. All retries that have branchPoint = userMessage._id
      const variants = []
      
      // Find the original response to this user message
      const originalResponse = messages.find(m => 
        m.messageType === "assistant" && 
        m.timestamp > userMessage.timestamp &&
        !m.branchPoint &&
        // Either in main branch or in a branch that contains this user message
        ((m.conversationBranchId || "main") === "main" || 
         messages.some(um => 
           um._id === userMessage._id && 
           (um.conversationBranchId || "main") === (m.conversationBranchId || "main")
         ))
      )
      
      if (originalResponse) {
        variants.push(originalResponse)
      }
      
      // Add all retries that branch from this user message
      const retries = messages.filter(m => 
        m.messageType === "assistant" && 
        m.branchPoint === userMessage._id
      )
      
      variants.push(...retries)
      
      // Remove duplicates and sort
      const uniqueVariants = variants.filter((v, i, arr) => 
        arr.findIndex(x => x._id === v._id) === i
      )
      
      const sortedVariants = uniqueVariants.sort((a, b) => a.timestamp - b.timestamp)
      
      // If no variants or only one variant, don't show navigation
      if (sortedVariants.length <= 1) {
        return null
      }
      
      // Find current message index in the variants
      const currentIndex = sortedVariants.findIndex(v => v._id === messageId)
      
      if (currentIndex === -1) {
        return null
      }

      console.log("🌳 Message-level variant navigation:", {
        messageId,
        userMessageId: userMessage._id,
        variantCount: sortedVariants.length,
        currentIndex,
        variants: sortedVariants.map(v => ({ 
          id: v._id, 
          branch: v.conversationBranchId,
          branchPoint: v.branchPoint,
          timestamp: v.timestamp 
        })),
        originalResponse: originalResponse ? {
          id: originalResponse._id,
          branch: originalResponse.conversationBranchId,
          branchPoint: originalResponse.branchPoint
        } : null,
        retries: retries.map(r => ({
          id: r._id,
          branch: r.conversationBranchId,
          branchPoint: r.branchPoint
        }))
      })

      return {
        currentIndex,
        totalBranches: sortedVariants.length,
        onNavigate: (index: number) => {
          const targetVariant = sortedVariants[index]
          if (targetVariant && (targetVariant.conversationBranchId || "main")) {
            console.log(
              `🌳 Navigating to message variant ${index + 1}/${sortedVariants.length}: ${targetVariant._id} in branch ${targetVariant.conversationBranchId || "main"}`,
            )
            switchToBranch(targetVariant.conversationBranchId || "main")
          }
        },
      }
    },
    [
      messages,
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
