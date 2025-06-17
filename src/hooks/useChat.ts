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

  // Store whether we're preparing for a new chat to maintain query consistency
  const isPreparingNewChatRef = useRef<boolean>(false)

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

  // Track when we're preparing for a new chat
  useEffect(() => {
    if (isNewChat) {
      isPreparingNewChatRef.current = true
    }
    // Clear the flag when we're no longer on a new chat
    if (!isNewChat) {
      isPreparingNewChatRef.current = false
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
  // IMPORTANT: Only query messages when we have a real thread ID
  // For new chats, we'll show optimistic updates in the UI without querying
  const messageThreadId = currentThread?._id || null

  // Memoize the query args to prevent unnecessary re-subscriptions
  const queryArgs = useMemo(
    () => (messageThreadId ? { threadId: messageThreadId } : "skip"),
    [messageThreadId],
  )

  const convexMessages = useQuery(api.messages.list, queryArgs) ?? []

  // Store optimistic messages for new chats
  const optimisticMessagesRef = useRef<Doc<"messages">[]>([])

  // Use optimistic messages for new chats, real messages otherwise
  const messages =
    isPreparingNewChatRef.current && !currentThread
      ? optimisticMessagesRef.current
      : convexMessages

  // DEBUG: Log message query details for debugging
  useEffect(() => {
    if (currentClientId) {
      console.log("🔍 useChat debug - branching scenario:", {
        currentClientId,
        currentThread: currentThread?._id,
        messageThreadId,
        messageCount: messages.length,
        firstMessage: messages[0]?.body?.slice(0, 50),
      })
    }
  }, [currentClientId, currentThread?._id, messageThreadId, messages.length])

  // Mutations with proper Convex optimistic updates
  const createThreadAndSend = useMutation(
    api.messages.createThreadAndSend,
  ).withOptimisticUpdate((localStore, args) => {
    // We'll skip optimistic updates for messages to avoid ID validation errors
    // The UI will handle showing optimistic messages separately
    // Only update the threads list for sidebar display
    const { title, clientId } = args
    const now = Date.now()

    // Create a temporary thread that won't cause ID validation issues
    // We'll use a special prefix that won't be confused with real Convex IDs
    const tempThreadId = `optimistic_${clientId}` as Id<"threads">

    // 1. Create optimistic thread for immediate sidebar display
    const optimisticThread: Doc<"threads"> = {
      _id: tempThreadId,
      _creationTime: now,
      clientId,
      title,
      userId: "optimistic_user" as Id<"users">, // Temporary user ID
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

    // Don't set message queries - we handle optimistic messages in the UI
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
          _id: `messages:${nanoid()}` as Id<"messages">,
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

        // Add optimistic message to local state for immediate display
        const optimisticMessage: Doc<"messages"> = {
          _id: `temp_msg_${nanoid()}` as Id<"messages">,
          _creationTime: Date.now(),
          threadId: `temp_thread_${clientId}` as Id<"threads">,
          body: message,
          messageType: "user",
          modelId: modelId as ModelId,
          timestamp: Date.now(),
          isStreaming: false,
          isComplete: true,
        }
        optimisticMessagesRef.current = [optimisticMessage]

        // Update URL first to show loading state
        window.history.replaceState({}, "", `/chat/${clientId}`)

        // Then create thread + send message
        await createThreadAndSend({
          title: "Generating title...",
          clientId: clientId,
          body: message,
          modelId: modelId as ModelId,
          attachments,
          webSearchEnabled,
        })

        // Clear optimistic messages once real thread is created
        optimisticMessagesRef.current = []

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
