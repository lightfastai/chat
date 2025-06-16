"use client"

import { useCallback } from "react"
import type { Doc } from "../../convex/_generated/dataModel"

type Message = Doc<"messages"> & {
  conversationBranchId?: string
  branchPoint?: string
}

export interface MessageVariantNavigation {
  currentIndex: number
  totalBranches: number
  onNavigate: (index: number) => void
}

export function useMessageVariants(
  messages: Message[],
  switchToBranch: (branchId: string) => void,
) {
  const getVariantNavigation = useCallback(
    (messageId: string): MessageVariantNavigation | null => {
      // MESSAGE-LEVEL VARIANT NAVIGATION:
      // Show navigation for messages that have multiple versions (retries)
      // This shows variants of the same message, not conversation branches

      const targetMessage = messages.find((m) => m._id === messageId)
      if (!targetMessage || targetMessage.messageType !== "assistant") {
        return null
      }

      // Find the user message that prompted this assistant response
      let userMessage = null

      console.log(`🔍 Finding user message for assistant: ${messageId}`)
      console.log(`🔍 - hasBranchPoint: ${!!targetMessage.branchPoint}`)
      console.log(`🔍 - branchPoint: ${targetMessage.branchPoint}`)
      console.log(`🔍 - conversationBranch: ${targetMessage.conversationBranchId || "main"}`)

      if (targetMessage.branchPoint) {
        // This is a retry message - find the user message it branches from
        userMessage = messages.find((m) => m._id === targetMessage.branchPoint)
        if (userMessage) {
          console.log(`🔍 Found user message via branchPoint: ${userMessage._id}`)
          console.log(`🔍 - body: "${userMessage.body.substring(0, 20)}"`)
          console.log(`🔍 - type: ${userMessage.messageType}`)
        } else {
          console.log("🔍 Found user message via branchPoint: NOT FOUND")
        }
      } else {
        // This is an original message - find the user message that directly precedes it
        // We need to be more precise: find the most recent user message that doesn't have 
        // any assistant messages between it and our target message
        const candidates = messages
          .filter(
            (m) =>
              m.messageType === "user" &&
              m.timestamp < targetMessage.timestamp &&
              (m.conversationBranchId || "main") ===
                (targetMessage.conversationBranchId || "main"),
          )
          .sort((a, b) => b.timestamp - a.timestamp)

        console.log(`🔍 User message candidates: ${candidates.length} found`)
        candidates.forEach((c, idx) => {
          console.log(`🔍 - [${idx}] ${c._id}: "${c.body.substring(0, 20)}" (ts:${c.timestamp}, branch:${c.conversationBranchId || "main"})`)
        })

        // For each candidate, check if there are any assistant messages between it and our target
        for (const candidate of candidates) {
          const assistantMessagesBetween = messages.filter(
            (m) =>
              m.messageType === "assistant" &&
              m.timestamp > candidate.timestamp &&
              m.timestamp < targetMessage.timestamp &&
              (m.conversationBranchId || "main") ===
                (targetMessage.conversationBranchId || "main"),
          )

          console.log(`🔍 Checking candidate ${candidate._id}: ${assistantMessagesBetween.length} assistant messages between it and target`)
          
          // If no assistant messages between this candidate and our target, this is the right user message
          if (assistantMessagesBetween.length === 0) {
            console.log(`🔍 Selected candidate ${candidate._id} - no assistant messages in between`)
            userMessage = candidate
            break
          } else {
            console.log(`🔍 Skipping candidate ${candidate._id} - has ${assistantMessagesBetween.length} assistant messages in between`)
          }
        }

        if (userMessage) {
          console.log(`🔍 Final selected user message: ${userMessage._id}`)
          console.log(`🔍 - body: "${userMessage.body.substring(0, 20)}"`)
          console.log(`🔍 - timestamp: ${userMessage.timestamp}`)
        } else {
          console.log("🔍 Final selected user message: NOT FOUND")
        }
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
      const originalResponse = messages.find(
        (m) =>
          m.messageType === "assistant" &&
          m.timestamp > userMessage.timestamp &&
          !m.branchPoint &&
          // Either in main branch or in a branch that contains this user message
          ((m.conversationBranchId || "main") === "main" ||
            messages.some(
              (um) =>
                um._id === userMessage._id &&
                (um.conversationBranchId || "main") ===
                  (m.conversationBranchId || "main"),
            )),
      )

      console.log(`🔍 Original response search for user: ${userMessage._id} (ts:${userMessage.timestamp})`)
      
      const allAssistantMessages = messages.filter((m) => m.messageType === "assistant")
      console.log(`🔍 All assistant messages: ${allAssistantMessages.length} found`)
      allAssistantMessages.forEach((m, idx) => {
        console.log(`🔍 - [${idx}] ${m._id}: "${m.body.substring(0, 30)}" (ts:${m.timestamp}, branch:${m.conversationBranchId || "main"}, branchPoint:${m.branchPoint || "none"})`)
      })
      
      if (originalResponse) {
        console.log(`🔍 Found original response: ${originalResponse._id}`)
        console.log(`🔍 - branch: ${originalResponse.conversationBranchId || "main"}`)
        console.log(`🔍 - body: "${originalResponse.body.substring(0, 30)}"`)
      } else {
        console.log("🔍 Original response: NOT FOUND")
      }

      if (originalResponse) {
        variants.push(originalResponse)
      }

      // Add all retries that branch from this user message
      const retries = messages.filter(
        (m) =>
          m.messageType === "assistant" && m.branchPoint === userMessage._id,
      )

      console.log(`🔍 Retries found: ${retries.length}`)
      retries.forEach((r, idx) => {
        console.log(`🔍 - retry[${idx}] ${r._id}: "${r.body.substring(0, 30)}" (branch:${r.conversationBranchId}, branchPoint:${r.branchPoint})`)
      })

      variants.push(...retries)

      // Remove duplicates and sort
      const uniqueVariants = variants.filter(
        (v, i, arr) => arr.findIndex((x) => x._id === v._id) === i,
      )

      const sortedVariants = uniqueVariants.sort(
        (a, b) => a.timestamp - b.timestamp,
      )

      console.log(`🔍 Total unique variants: ${sortedVariants.length}`)
      sortedVariants.forEach((v, idx) => {
        console.log(`🔍 - variant[${idx}] ${v._id}: "${v.body.substring(0, 20)}" (ts:${v.timestamp}, branch:${v.conversationBranchId || "main"})`)
      })

      // If no variants or only one variant, don't show navigation
      if (sortedVariants.length <= 1) {
        console.log("🌳 No navigation needed - only 1 variant or less")
        return null
      }

      // Find current message index in the variants
      const currentIndex = sortedVariants.findIndex((v) => v._id === messageId)

      if (currentIndex === -1) {
        console.log("🌳 Current message not found in variants - returning null")
        return null
      }

      console.log(`🌳 Message-level variant navigation for ${messageId}:`)
      console.log(`🌳 - userMessageId: ${userMessage._id}`)
      console.log(`🌳 - variantCount: ${sortedVariants.length}`)
      console.log(`🌳 - currentIndex: ${currentIndex}`)
      console.log(`🌳 - will show navigation: ${currentIndex + 1}/${sortedVariants.length}`)

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
    [messages, switchToBranch],
  )

  return {
    getVariantNavigation,
  }
}
