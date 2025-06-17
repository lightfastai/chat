"use client"

import { useChat } from "@/hooks/useChat"
import type { ModelId } from "@/lib/ai/types"
import { useGuestChat } from "@/providers/guest-chat-provider"
import type { GuestMessage } from "@/lib/guest-storage"
import { useConvexAuth } from "convex/react"
import { useCallback, useMemo } from "react"
import type { Doc, Id } from "../../convex/_generated/dataModel"

// Adapter to convert guest messages to Convex message format
function guestMessageToConvexMessage(guestMsg: GuestMessage): Doc<"messages"> {
  return {
    _id: guestMsg.id as Id<"messages">,
    _creationTime: guestMsg.createdAt,
    threadId: guestMsg.threadId as Id<"threads">,
    body: guestMsg.content,
    messageType: guestMsg.role === "user" ? "user" : "assistant",
    modelId: guestMsg.model as ModelId,
    timestamp: guestMsg.createdAt,
    isStreaming: false,
    isComplete: true,
    usage: guestMsg.usage
      ? {
          inputTokens: guestMsg.usage.promptTokens,
          outputTokens: guestMsg.usage.completionTokens,
          totalTokens: guestMsg.usage.totalTokens,
        }
      : undefined,
  }
}

// Hook that provides unified chat interface for both authenticated and guest users
export function useChatWithGuest() {
  const { isAuthenticated } = useConvexAuth()
  const authenticatedChat = useChat()
  const guestChat = useGuestChat()

  // If we're in a context where guest chat isn't available, fall back to authenticated
  if (!guestChat) {
    return authenticatedChat
  }

  // If authenticated, use the regular chat hook
  if (isAuthenticated) {
    return authenticatedChat
  }

  // For guest users, adapt the guest chat interface to match the expected API
  const messages = useMemo(() => {
    return guestChat.messages.map(guestMessageToConvexMessage)
  }, [guestChat.messages])

  const currentThread = useMemo(() => {
    if (!guestChat.currentThread) return null

    return {
      _id: guestChat.currentThread.id as Id<"threads">,
      _creationTime: guestChat.currentThread.createdAt,
      title: guestChat.currentThread.title,
      isGenerating: false,
      modelId: guestChat.currentThread.model as ModelId,
      usage: undefined,
    }
  }, [guestChat.currentThread])

  const handleSendMessage = useCallback(
    async (
      message: string,
      modelId: string,
      _attachments?: Id<"files">[],
      _webSearchEnabled?: boolean,
    ) => {
      // If no current thread, create one
      if (!guestChat.currentThread) {
        const threadId = guestChat.createThread("New Chat", modelId)
        if (!threadId) {
          console.error("Failed to create guest thread - limit reached")
          return
        }
      }

      // Add user message
      const userMessage = guestChat.addMessage({
        content: message,
        role: "user",
        model: modelId,
      })

      if (!userMessage) {
        console.error("Failed to add message - limit reached")
        return
      }

      // TODO: In a real implementation, this would call an API to get AI response
      // For now, add a mock assistant response
      setTimeout(() => {
        guestChat.addMessage({
          content:
            "I'm currently in guest mode. To get AI responses, please sign in to create an account.",
          role: "assistant",
          model: modelId,
          usage: {
            promptTokens: 10,
            completionTokens: 15,
            totalTokens: 25,
          },
        })

        // Update thread title if it's the first message
        if (
          guestChat.currentThread &&
          guestChat.currentThread.title === "New Chat"
        ) {
          guestChat.updateThreadTitle(
            guestChat.currentThread.id,
            message.slice(0, 50),
          )
        }
      }, 1000)
    },
    [guestChat],
  )

  return {
    messages,
    currentThread,
    handleSendMessage,
    emptyState: {
      title: "Start a conversation",
      description: "You're in guest mode. Sign in to save your chat history.",
    },
    isDisabled: !guestChat.canAddMessage,
    isNewChat: !guestChat.currentThread,
  }
}
