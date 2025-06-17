"use client"

import type { ModelId } from "@/lib/ai/types"
import { isClientId, nanoid } from "@/lib/nanoid"
import { useMutation, useQuery } from "convex/react"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef } from "react"
import { api } from "../../convex/_generated/api"
import type { Doc, Id } from "../../convex/_generated/dataModel"

export function useChat() {
  const pathname = usePathname()

  // Store the temporary thread ID to maintain consistency across URL changes
  const tempThreadIdRef = useRef<Id<"threads"> | null>(null)

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

  // Pre-generate thread ID for new chats to ensure query is active
  useEffect(() => {
    if (isNewChat && !tempThreadIdRef.current) {
      tempThreadIdRef.current = nanoid(32) as Id<"threads">
    }
  }, [isNewChat])

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
  // IMPORTANT: For optimistic updates to work when transitioning from /chat to /chat/{clientId},
  // we need to use the temporary thread ID when we have a clientId but no server thread yet
  // ALWAYS use tempThreadIdRef if it's set, even on /chat, to ensure query is active
  const messageThreadId = tempThreadIdRef.current || currentThread?._id || null

  // Memoize the query args to prevent unnecessary re-subscriptions
  const queryArgs = useMemo(
    () => (messageThreadId ? { threadId: messageThreadId } : "skip"),
    [messageThreadId],
  )

  const convexMessages = useQuery(api.messages.list, queryArgs) ?? []

  // Clear temp thread ID when we get a real thread from server
  useEffect(() => {
    if (currentThread && tempThreadIdRef.current) {
      tempThreadIdRef.current = null
    }
  }, [currentThread])

  const messages = convexMessages

  // DEBUG: Log message query details for debugging
  useEffect(() => {
    if (currentClientId) {
      console.log("🔍 useChat debug - branching scenario:", {
        currentClientId,
        currentThread: currentThread?._id,
        messageThreadId,
        messageCount: messages.length,
        firstMessage: messages[0]?.body?.slice(0, 50)
      })
    }
  }, [currentClientId, currentThread?._id, messageThreadId, messages.length])

  // Mutations with proper Convex optimistic updates
  const createThreadAndSend = useMutation(
    api.messages.createThreadAndSend,
  ).withOptimisticUpdate((localStore, args) => {
    const { title, clientId, body, modelId } = args
    const now = Date.now()

    // Use stored temp thread ID if available (for consistency across URL changes)
    // Otherwise generate a new one using nanoid with the same format as Convex IDs
    const tempThreadId =
      tempThreadIdRef.current || (nanoid(32) as Id<"threads">)
    // Only update the ref if we generated a new ID
    if (!tempThreadIdRef.current) {
      tempThreadIdRef.current = tempThreadId
    }

    // 1. Create optimistic thread for immediate sidebar display
    const optimisticThread: Doc<"threads"> = {
      _id: tempThreadId,
      _creationTime: now,
      clientId,
      title,
      userId: "temp" as Id<"users">, // Temporary user ID
      createdAt: now,
      lastMessageAt: now,
      isTitleGenerating: true,
      isGenerating: true,
    }

    // Get existing threads from the store
    const existingThreads = localStore.getQuery(api.threads.list, {}) || []

    // Add the new thread at the beginning
    localStore.setQuery(api.threads.list, {}, [
      optimisticThread,
      ...existingThreads,
    ])

    // 2. Also update thread by clientId query
    localStore.setQuery(
      api.threads.getByClientId,
      { clientId },
      optimisticThread,
    )

    // 3. Create optimistic message
    const optimisticMessage: Doc<"messages"> = {
      _id: nanoid(32) as Id<"messages">,
      _creationTime: now,
      threadId: tempThreadId,
      body,
      messageType: "user",
      modelId,
      timestamp: now,
      isStreaming: false,
      isComplete: true,
    }

    // Set the optimistic message for this thread
    localStore.setQuery(api.messages.list, { threadId: tempThreadId }, [
      optimisticMessage,
    ])
  })

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
          _id: nanoid(32) as Id<"messages">,
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

  const handleSendMessage = async (
    message: string,
    modelId: string,
    attachments?: Id<"files">[],
    webSearchEnabled?: boolean,
  ) => {
    if (!message.trim()) return

    try {
      if (isNewChat) {
        // 🚀 Generate client ID for new chat
        const clientId = nanoid()

        // Use the pre-generated thread ID (from useEffect)
        const tempThreadId = tempThreadIdRef.current!

        // Create thread + send message with Convex optimistic updates
        // Do this FIRST while the query is still using the same thread ID
        const createPromise = createThreadAndSend({
          title: "Generating title...",
          clientId: clientId,
          body: message,
          modelId: modelId as ModelId,
          attachments,
          webSearchEnabled,
        })

        // Then update URL - the query should maintain its optimistic updates
        // because the threadId hasn't changed
        window.history.replaceState({}, "", `/chat/${clientId}`)

        // Wait for the mutation to complete
        await createPromise

        return
      }

      if (currentClientId && !currentThread) {
        // We have a clientId but thread doesn't exist yet, create it + send message
        await createThreadAndSend({
          title: "Generating title...",
          clientId: currentClientId,
          body: message,
          modelId: modelId as ModelId,
          attachments,
          webSearchEnabled,
        })
      } else if (currentThread) {
        // Normal message sending with Convex optimistic update
        await sendMessage({
          threadId: currentThread._id,
          body: message,
          modelId: modelId as ModelId,
          attachments,
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
    messages,
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
