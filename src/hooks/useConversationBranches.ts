"use client"

import { useMemo } from "react"
import type { Doc } from "../../convex/_generated/dataModel"
import { useBranchNavigation } from "./useBranchNavigation"
import { useConversationTree } from "./useConversationTree"
import type { ConversationBranch } from "./useConversationTree"
import { useMessageVariants } from "./useMessageVariants"

type Message = Doc<"messages"> & {
  conversationBranchId?: string
  branchPoint?: string
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
  // Build conversation tree from messages
  const conversationTree = useConversationTree(messages)

  // Handle branch navigation and auto-switching
  const { currentBranch, switchToBranch, getMessagesForBranch } =
    useBranchNavigation(conversationTree)

  // Handle message variant navigation
  const { getVariantNavigation } = useMessageVariants(messages, switchToBranch)

  return useMemo(
    () => ({
      currentBranch,
      branches: conversationTree.branches,
      switchToBranch,
      getMessagesForBranch,
      getBranchNavigation: getVariantNavigation,
    }),
    [
      currentBranch,
      conversationTree.branches,
      switchToBranch,
      getMessagesForBranch,
      getVariantNavigation,
    ],
  )
}
