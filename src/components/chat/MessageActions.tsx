"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getAllModels } from "@/lib/ai/models"
import type { ModelId } from "@/lib/ai/types"
import { nanoid } from "@/lib/nanoid"
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard"
import { cn } from "@/lib/utils"
import { useMutation, useQuery } from "convex/react"
import {
  CheckIcon,
  ClipboardIcon,
  GitBranch,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import React from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Doc, Id } from "../../../convex/_generated/dataModel"
import { FeedbackModal } from "./FeedbackModal"

interface MessageActionsProps {
  message: Doc<"messages">
  className?: string
}

export function MessageActions({ message, className }: MessageActionsProps) {
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false)
  const { copy, isCopied } = useCopyToClipboard({ timeout: 2000 })

  const feedback = useQuery(api.feedback.getUserFeedbackForMessage, {
    messageId: message._id,
  })

  const submitFeedback = useMutation(api.feedback.submitFeedback)
  const removeFeedback = useMutation(api.feedback.removeFeedback)
  const branchThread = useMutation(
    api.threads.branchFromMessage,
  ).withOptimisticUpdate((localStore, args) => {
    const { clientId, originalThreadId } = args
    if (!clientId) return // Only do optimistic updates with clientId

    const now = Date.now()

    // Get the original thread to copy its title
    const originalThread = localStore.getQuery(api.threads.get, {
      threadId: originalThreadId,
    })

    // CRITICAL: Use a deterministic temp thread ID that can be referenced later
    // This matches the pattern used in useChat.ts for createThreadAndSend
    const tempThreadId = crypto.randomUUID() as Id<"threads">

    // Create optimistic branched thread for immediate sidebar display
    const optimisticThread: Doc<"threads"> = {
      _id: tempThreadId,
      _creationTime: now,
      clientId,
      title: originalThread?.title || "Branched conversation",
      userId: "temp" as Id<"users">, // Temporary user ID
      createdAt: now,
      lastMessageAt: now,
      isGenerating: true, // Will show loading state
      branchedFrom: {
        threadId: originalThreadId,
        messageId: args.branchFromMessageId,
        timestamp: now,
      },
      usage: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalReasoningTokens: 0,
        totalCachedInputTokens: 0,
        messageCount: 0,
        modelStats: {},
      },
    }

    // Get existing threads from the store
    const existingThreads = localStore.getQuery(api.threads.list, {}) || []

    // Add the new branched thread at the beginning
    localStore.setQuery(api.threads.list, {}, [
      optimisticThread,
      ...existingThreads,
    ])

    // CRITICAL: Update thread by clientId query for instant routing
    // This allows useChat hook to find the thread immediately
    localStore.setQuery(
      api.threads.getByClientId,
      { clientId },
      optimisticThread,
    )

    // Optimistically copy messages from original thread up to branch point
    const originalMessages = localStore.getQuery(api.messages.list, {
      threadId: originalThreadId,
    })
    if (originalMessages) {
      // Find branch point message
      const branchPointIndex = originalMessages.findIndex(
        (msg) => msg._id === args.branchFromMessageId,
      )

      if (branchPointIndex !== -1) {
        // Find the last user message before or at the branch point
        let lastUserMessageIndex = -1
        for (let i = branchPointIndex; i >= 0; i--) {
          if (originalMessages[i].messageType === "user") {
            lastUserMessageIndex = i
            break
          }
        }

        // Copy messages up to and including the last user message
        // Note: originalMessages is in descending order (newest first)
        const copyUpToIndex =
          lastUserMessageIndex !== -1 ? lastUserMessageIndex : branchPointIndex
        const messagesToCopy = originalMessages.slice(copyUpToIndex)

        // Create optimistic copies with the SAME tempThreadId
        const optimisticMessages = messagesToCopy.map((msg) => ({
          ...msg,
          _id: crypto.randomUUID() as Id<"messages">,
          threadId: tempThreadId, // Use the same tempThreadId as the thread
        }))

        // CRITICAL: Set optimistic messages using the tempThreadId
        // This ensures useChat hook can find them immediately
        localStore.setQuery(
          api.messages.list,
          { threadId: tempThreadId },
          optimisticMessages,
        )

        // DEBUG: Also log what we're setting for debugging
        console.log("🚀 Optimistic branch - setting messages:", {
          tempThreadId,
          clientId,
          messageCount: optimisticMessages.length,
          firstMessage: optimisticMessages[0]?.body?.slice(0, 50)
        })
      }
    }
  })

  const allModels = getAllModels()

  const handleFeedback = async (rating: "positive" | "negative") => {
    if (rating === "negative") {
      setShowFeedbackModal(true)
      return
    }

    if (feedback?.rating === rating) {
      await removeFeedback({ messageId: message._id })
    } else {
      await submitFeedback({
        messageId: message._id,
        rating: "positive",
        comment: feedback?.comment,
        reasons: feedback?.reasons,
      })
    }
  }

  const handleCopy = () => {
    if (message.body) {
      copy(message.body)
    }
  }

  const handleBranch = async (modelId: ModelId) => {
    try {
      // 🚀 Generate client ID for instant navigation (like new chat)
      const clientId = nanoid()

      // Update URL immediately without navigation events
      // Using window.history.replaceState like Vercel's AI chatbot for smoothest UX
      window.history.replaceState({}, "", `/chat/${clientId}`)

      // Show immediate feedback
      toast.success("Creating new branch...")

      // Create branch in background - the useChat hook will handle optimistic updates
      await branchThread({
        originalThreadId: message.threadId,
        branchFromMessageId: message._id,
        modelId,
        clientId, // Pass clientId to backend
      })

      toast.success("Branch created successfully")
    } catch (error) {
      console.error("Failed to create branch:", error)
      toast.error("Failed to create branch")
      // TODO: Revert URL on error - could navigate back to original thread
    }
  }

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 transition-colors",
            feedback?.rating === "positive" &&
              "text-green-600 hover:text-green-700",
          )}
          onClick={() => handleFeedback("positive")}
          aria-label="Like message"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 transition-colors",
            feedback?.rating === "negative" &&
              "text-red-600 hover:text-red-700",
          )}
          onClick={() => handleFeedback("negative")}
          aria-label="Dislike message"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
        {message.body && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            aria-label={isCopied ? "Copied" : "Copy message"}
          >
            {isCopied ? (
              <CheckIcon className="h-4 w-4 text-green-600" />
            ) : (
              <ClipboardIcon className="h-4 w-4" />
            )}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Branch from here"
            >
              <GitBranch className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {allModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => handleBranch(model.id as ModelId)}
                className="flex flex-col items-start py-2"
              >
                <span className="font-medium">{model.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {model.description}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showFeedbackModal && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          messageId={message._id}
          existingFeedback={feedback}
        />
      )}
    </>
  )
}
