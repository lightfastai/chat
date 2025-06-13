"use client"

import type { ModelId } from "@/lib/ai/types"
import { isClientId, nanoid } from "@/lib/nanoid"
import { useMutation, useQuery } from "convex/react"
import { usePathname, useRouter } from "next/navigation"
import { useMemo } from "react"
import { api } from "../../convex/_generated/api"
import type { Doc, Id } from "../../convex/_generated/dataModel"

export function useChat() {
  const router = useRouter()
  const pathname = usePathname()

  // Extract current thread info from pathname with clientId support
  const pathInfo = useMemo(() => {
    if (pathname === "/chat") {
      return { type: "new", id: "new" }
    }

    const match = pathname.match(/^\/chat\/(.+)$/)
    if (!match) {
      return { type: "new", id: "new" }
    }

    const id = match[1]

    // Check if it's a client-generated ID (nanoid)
    if (isClientId(id)) {
      return { type: "clientId", id }
    }

    // Otherwise it's a real Convex thread ID
    return { type: "threadId", id: id as Id<"threads"> }
  }, [pathname])

  const currentThreadId = pathInfo.type === "threadId" ? pathInfo.id : "new"
  const currentClientId = pathInfo.type === "clientId" ? pathInfo.id : null
  const isNewChat = currentThreadId === "new" && !currentClientId

  // Get thread by clientId if we have one
  const threadByClientId = useQuery(
    api.threads.getByClientId,
    currentClientId ? { clientId: currentClientId } : "skip",
  )

  // Get thread by ID for regular threads
  const threadById = useQuery(
    api.threads.get,
    currentThreadId !== "new"
      ? { threadId: currentThreadId as Id<"threads"> }
      : "skip",
  )

  // Determine the actual thread to use
  const currentThread = threadByClientId || threadById

  // Get messages for current thread
  const messages =
    useQuery(
      api.messages.list,
      currentThread ? { threadId: currentThread._id } : "skip",
    ) ?? []

  // Mutations with proper Convex optimistic updates
  const createThreadAndSend = useMutation(api.messages.createThreadAndSend)
  // Note: Optimistic updates for new threads are handled via instant navigation to clientId URL
  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate(
    (localStore, args) => {
      const { threadId, body, modelId } = args
      const existingMessages = localStore.getQuery(api.messages.list, {
        threadId,
      })

      // If we've loaded the messages for this thread, add optimistic message
      if (existingMessages !== undefined) {
        const now = Date.now()
        const optimisticMessage: Doc<"messages"> = {
          _id: crypto.randomUUID() as Id<"messages">,
          _creationTime: now,
          threadId,
          body,
          messageType: "user",
          modelId,
          timestamp: now,
          isStreaming: false,
          isComplete: true,
        }

        // Create new array with optimistic message at the beginning
        // (since backend returns messages in desc order - newest first)
        localStore.setQuery(api.messages.list, { threadId }, [
          optimisticMessage,
          ...existingMessages,
        ])
      }
    },
  )

  // Use messages directly - Convex optimistic updates handle everything
  const allMessages = messages

  const handleSendMessage = async (
    message: string,
    modelId: string,
    webSearchEnabled?: boolean,
  ) => {
    if (!message.trim()) return

    try {
      if (isNewChat) {
        // 🚀 Generate client ID and navigate instantly
        const clientId = nanoid()
        router.replace(`/chat/${clientId}`)

        // Create thread + send message atomically with optimistic updates
        await createThreadAndSend({
          title: "Generating title...",
          clientId: clientId,
          body: message,
          modelId: modelId as ModelId,
          webSearchEnabled,
        })

        return
      }

      if (currentClientId && !currentThread) {
        // We have a clientId but thread doesn't exist yet, create it + send message
        await createThreadAndSend({
          title: "Generating title...",
          clientId: currentClientId,
          body: message,
          modelId: modelId as ModelId,
          webSearchEnabled,
        })
      } else if (currentThread) {
        // Normal message sending with Convex optimistic update
        await sendMessage({
          threadId: currentThread._id,
          body: message,
          modelId: modelId as ModelId,
          webSearchEnabled,
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      throw error
    }
  }

  const getEmptyStateTitle = () => {
    if (isNewChat) {
      return "Welcome to AI Chat"
    }
    if (currentClientId && !currentThread) {
      return ""
    }
    return currentThread?.title || ""
  }

  const getEmptyStateDescription = () => {
    if (isNewChat) {
      return "Start a conversation with our AI assistant. Messages stream in real-time!"
    }
    if (currentClientId && !currentThread) {
      return ""
    }
    return ""
  }

  return {
    messages: allMessages,
    currentThread,
    isNewChat,
    handleSendMessage,
    emptyState: {
      title: getEmptyStateTitle(),
      description: getEmptyStateDescription(),
    },
    isDisabled: currentThread === null && !isNewChat && !currentClientId,
  }
}
