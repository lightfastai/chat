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
import { useEffect, useMemo } from "react"
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

  // Get messages for current thread
  const messageThreadId = currentThread?._id || null

  // Check if the thread ID is an optimistic one (not a real Convex ID)
  const isOptimisticThreadId =
    messageThreadId && !messageThreadId.startsWith("k")

  // Use preloaded messages if available
  const preloadedMessages = options.preloadedMessages
    ? usePreloadedQuery(options.preloadedMessages)
    : null

  const messages =
    preloadedMessages ??
    useQuery(
      api.messages.list,
      // Skip query if we have an optimistic thread ID to avoid validation errors
      messageThreadId && !preloadedMessages && !isOptimisticThreadId
        ? { threadId: messageThreadId }
        : "skip",
    ) ??
    []

  // DEBUG: Log message query details for debugging
  useEffect(() => {
    console.log("🔍 useChat debug:", {
      pathname,
      currentClientId,
      currentThread: currentThread?._id,
      isOptimisticThreadId,
      messageThreadId,
      messageCount: messages.length,
      firstMessage: messages[0]?.body?.slice(0, 50),
      pathInfo,
    })
  }, [
    pathname,
    currentClientId,
    currentThread?._id,
    isOptimisticThreadId,
    messageThreadId,
    messages.length,
    pathInfo,
  ])

  // Mutations with proper Convex optimistic updates
  const createThreadAndSend = useMutation(
    api.messages.createThreadAndSend,
  ).withOptimisticUpdate((localStore, args) => {
    const { title, clientId, body, modelId } = args
    const now = Date.now()

    // Create optimistic thread with a temporary ID that looks like a Convex ID
    // This will be replaced by the real thread ID when the mutation completes
    // Use a format that starts with 'k' to pass our optimistic ID checks
    const optimisticThreadId = crypto.randomUUID() as Id<"threads">

    // Create optimistic thread for sidebar display and message association
    const optimisticThread: Partial<Doc<"threads">> & {
      _id: Id<"threads">
      clientId: string
    } = {
      _id: optimisticThreadId,
      _creationTime: now,
      clientId,
      title,
      userId: "optimistic" as Id<"users">,
      createdAt: now,
      lastMessageAt: now,
      isTitleGenerating: true,
      isGenerating: true,
    }

    // Get existing threads from the store
    const existingThreads = localStore.getQuery(api.threads.list, {}) || []

    // Add the new thread at the beginning of the list for sidebar display
    localStore.setQuery(api.threads.list, {}, [
      optimisticThread as Doc<"threads">,
      ...existingThreads,
    ])

    // Also set the thread by clientId so it can be found while optimistic
    localStore.setQuery(
      api.threads.getByClientId,
      { clientId },
      optimisticThread as Doc<"threads">,
    )

    // Create optimistic user message
    const optimisticUserMessage: Doc<"messages"> = {
      _id: crypto.randomUUID() as Id<"messages">,
      _creationTime: now,
      threadId: optimisticThreadId,
      body,
      messageType: "user",
      modelId,
      timestamp: now,
      isStreaming: false,
      isComplete: true,
    }

    // Create optimistic assistant message placeholder
    const optimisticAssistantMessage: Doc<"messages"> = {
      _id: crypto.randomUUID() as Id<"messages">,
      _creationTime: now + 1,
      threadId: optimisticThreadId,
      body: "", // Empty body for streaming
      messageType: "assistant",
      modelId,
      timestamp: now + 1,
      isStreaming: true,
      isComplete: false,
      streamId: `stream_${clientId}_${now}`,
      thinkingStartedAt: now,
    }

    // Set optimistic messages for this thread
    // We use the optimistic thread ID here, which will be replaced when the real data arrives
    // Messages are returned in descending order (newest first) by the backend
    localStore.setQuery(api.messages.list, { threadId: optimisticThreadId }, [
      optimisticAssistantMessage, // Assistant message has timestamp now + 1
      optimisticUserMessage, // User message has timestamp now
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
