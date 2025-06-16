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

      console.log("🔍 Finding user message for assistant:", {
        messageId,
        hasBranchPoint: !!targetMessage.branchPoint,
        branchPoint: targetMessage.branchPoint,
        conversationBranch: targetMessage.conversationBranchId || "main",
      })

      if (targetMessage.branchPoint) {
        // This is a retry message - find the user message it branches from
        userMessage = messages.find((m) => m._id === targetMessage.branchPoint)
        console.log(
          "🔍 Found user message via branchPoint:",
          userMessage
            ? {
                id: userMessage._id,
                body: userMessage.body.substring(0, 20),
                type: userMessage.messageType,
              }
            : "NOT FOUND",
        )
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

        console.log(
          "🔍 User message candidates:",
          candidates.map((c) => ({
            id: c._id,
            body: c.body.substring(0, 20),
            timestamp: c.timestamp,
            branch: c.conversationBranchId || "main",
          })),
        )

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

          // If no assistant messages between this candidate and our target, this is the right user message
          if (assistantMessagesBetween.length === 0) {
            userMessage = candidate
            break
          }
        }

        console.log(
          "🔍 Selected user message:",
          userMessage
            ? {
                id: userMessage._id,
                body: userMessage.body.substring(0, 20),
                timestamp: userMessage.timestamp,
              }
            : "NOT FOUND",
        )
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

      console.log("🔍 Original response search:", {
        userMessageId: userMessage._id,
        userTimestamp: userMessage.timestamp,
        allAssistantMessages: messages
          .filter((m) => m.messageType === "assistant")
          .map((m) => ({
            id: m._id,
            timestamp: m.timestamp,
            branchPoint: m.branchPoint,
            branch: m.conversationBranchId || "main",
            body: m.body.substring(0, 30),
          })),
        originalResponse: originalResponse
          ? {
              id: originalResponse._id,
              branch: originalResponse.conversationBranchId || "main",
              body: originalResponse.body.substring(0, 30),
            }
          : null,
      })

      if (originalResponse) {
        variants.push(originalResponse)
      }

      // Add all retries that branch from this user message
      const retries = messages.filter(
        (m) =>
          m.messageType === "assistant" && m.branchPoint === userMessage._id,
      )

      console.log(
        "🔍 Retries found:",
        retries.map((r) => ({
          id: r._id,
          branchPoint: r.branchPoint,
          branch: r.conversationBranchId,
          body: r.body.substring(0, 30),
        })),
      )

      variants.push(...retries)

      // Remove duplicates and sort
      const uniqueVariants = variants.filter(
        (v, i, arr) => arr.findIndex((x) => x._id === v._id) === i,
      )

      const sortedVariants = uniqueVariants.sort(
        (a, b) => a.timestamp - b.timestamp,
      )

      // If no variants or only one variant, don't show navigation
      if (sortedVariants.length <= 1) {
        return null
      }

      // Find current message index in the variants
      const currentIndex = sortedVariants.findIndex((v) => v._id === messageId)

      if (currentIndex === -1) {
        return null
      }

      console.log("🌳 Message-level variant navigation:", {
        messageId,
        userMessageId: userMessage._id,
        variantCount: sortedVariants.length,
        currentIndex,
        variants: sortedVariants.map((v) => ({
          id: v._id,
          branch: v.conversationBranchId,
          branchPoint: v.branchPoint,
          timestamp: v.timestamp,
        })),
        originalResponse: originalResponse
          ? {
              id: originalResponse._id,
              branch: originalResponse.conversationBranchId,
              branchPoint: originalResponse.branchPoint,
            }
          : null,
        retries: retries.map((r) => ({
          id: r._id,
          branch: r.conversationBranchId,
          branchPoint: r.branchPoint,
        })),
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
    [messages, switchToBranch],
  )

  return {
    getVariantNavigation,
  }
}
