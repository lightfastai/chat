"use client"

import type { ModelId } from "@/lib/ai/types"
import { isClientId, nanoid } from "@/lib/nanoid"
import {
  type Preloaded,
  useMutation,
  usePreloadedQuery,
  useQuery,
} from "convex/react"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef } from "react"
import { api } from "../../convex/_generated/api"
import type { Doc, Id } from "../../convex/_generated/dataModel"

interface UseChatOptions {
  preloadedThreadById?: Preloaded<typeof api.threads.get>
  preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>
  preloadedMessages?: Preloaded<typeof api.messages.list>
}

export function useChat(options: UseChatOptions = {}) {
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

    // Handle special routes
    if (id === "settings" || id.startsWith("settings/")) {
      return { type: "settings", id: "settings" }
    }

    // Check if it's a client-generated ID (nanoid)
    if (isClientId(id)) {
      return { type: "clientId", id }
    }

    // Otherwise it's a real Convex thread ID
    return { type: "threadId", id: id as Id<"threads"> }
  }, [pathname])

  const currentThreadId = pathInfo.type === "threadId" ? pathInfo.id : "new"
  const currentClientId = pathInfo.type === "clientId" ? pathInfo.id : null
  const isSettingsPage = pathInfo.type === "settings"
  const isNewChat = currentThreadId === "new" && !currentClientId

  // Use preloaded thread data if available, otherwise fall back to regular queries
  const preloadedThreadById = options.preloadedThreadById
    ? usePreloadedQuery(options.preloadedThreadById)
    : null

  const preloadedThreadByClientId = options.preloadedThreadByClientId
    ? usePreloadedQuery(options.preloadedThreadByClientId)
    : null

  const preloadedThread = preloadedThreadById || preloadedThreadByClientId

  // Get thread by clientId if we have one (skip for settings and if preloaded)
  const threadByClientId = useQuery(
    api.threads.getByClientId,
    currentClientId && !isSettingsPage && !preloadedThread
      ? { clientId: currentClientId }
      : "skip",
  )

  // Get thread by ID for regular threads (skip for settings and if preloaded)
  const threadById = useQuery(
    api.threads.get,
    currentThreadId !== "new" && !isSettingsPage && !preloadedThread
      ? { threadId: currentThreadId as Id<"threads"> }
      : "skip",
  )

  // Determine the actual thread to use - prefer preloaded, then fallback to queries
  const currentThread = preloadedThread || threadByClientId || threadById

  // Clear temp thread ID when we get a real thread from server
  useEffect(() => {
    if (currentThread && tempThreadIdRef.current) {
      tempThreadIdRef.current = null
    }
  }, [currentThread])

  // Get messages for current thread
  // IMPORTANT: For optimistic updates to work when transitioning from /chat to /chat/{clientId},
  // we need to use the temporary thread ID when we have a clientId but no server thread yet
  // For branching scenarios, the optimistic thread will have an _id that we should use
  const messageThreadId =
    currentThread?._id ||
    (currentClientId && tempThreadIdRef.current) ||
    (isNewChat && tempThreadIdRef.current) || // Also check for new chat with temp thread
    null

  // Use preloaded messages if available
  const preloadedMessages = options.preloadedMessages
    ? usePreloadedQuery(options.preloadedMessages)
    : null

  const messagesQuery = useQuery(
    api.messages.list,
    messageThreadId && !preloadedMessages
      ? { threadId: messageThreadId }
      : "skip",
  )

  const messages = preloadedMessages ?? messagesQuery ?? []

  // DEBUG: Log the actual query being made
  useEffect(() => {
    if (messageThreadId && !preloadedMessages) {
      console.log("📨 Messages query:", {
        messageThreadId,
        messagesFound: messagesQuery?.length,
        isSkipped: !messageThreadId || !!preloadedMessages,
      })
    }
  }, [messageThreadId, messagesQuery?.length, preloadedMessages])

  // DEBUG: Log message query details for debugging
  useEffect(() => {
    if (currentClientId) {
      console.log("🔍 useChat debug - branching scenario:", {
        currentClientId,
        currentThread: currentThread?._id,
        messageThreadId,
        messageCount: messages.length,
        firstMessage: messages[0]?.body?.slice(0, 50),
        threadByClientId: threadByClientId?._id,
        preloadedThread: preloadedThread?._id,
        tempThreadIdRef: tempThreadIdRef.current,
      })
    }
  }, [
    currentClientId,
    currentThread?._id,
    messageThreadId,
    messages.length,
    threadByClientId?._id,
    preloadedThread?._id,
  ])

  // Mutations with proper Convex optimistic updates
  const createThreadAndSend = useMutation(
    api.messages.createThreadAndSend,
  ).withOptimisticUpdate((localStore, args) => {
    const { title, clientId, body, modelId } = args
    const now = Date.now()

    // Use stored temp thread ID if available (for consistency across URL changes)
    // Otherwise generate a new one
    const tempThreadId =
      tempThreadIdRef.current || (crypto.randomUUID() as Id<"threads">)
    tempThreadIdRef.current = tempThreadId

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
      _id: crypto.randomUUID() as Id<"messages">,
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

        // Pre-generate the temporary thread ID to ensure consistency
        const tempThreadId = crypto.randomUUID() as Id<"threads">
        tempThreadIdRef.current = tempThreadId

        // Update URL immediately without navigation events
        // Using window.history.replaceState like Vercel's AI chatbot for smoothest UX
        window.history.replaceState({}, "", `/chat/${clientId}`)

        // Create thread + send message atomically with optimistic updates
        await createThreadAndSend({
          title: "Generating title...",
          clientId: clientId,
          body: message,
          modelId: modelId as ModelId,
          attachments,
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
