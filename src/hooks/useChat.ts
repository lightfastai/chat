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
  // Store previous pathname to detect navigation changes
  const prevPathnameRef = useRef(pathname)

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

  // Clear temp thread ID when we get a real thread from server
  useEffect(() => {
    if (currentThread && tempThreadIdRef.current) {
      tempThreadIdRef.current = null
    }
  }, [currentThread])

  // Reset temporary thread ID when navigating away
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      // Navigation occurred - only reset temp thread if moving to a different chat
      const prevMatch = prevPathnameRef.current.match(/^\/chat\/(.+)$/)
      const currentMatch = pathname.match(/^\/chat\/(.+)$/)

      if (!prevMatch || !currentMatch || prevMatch[1] !== currentMatch[1]) {
        tempThreadIdRef.current = null
      }

      prevPathnameRef.current = pathname
    }
  }, [pathname])

  // Get messages for current thread
  // IMPORTANT: For optimistic updates to work when transitioning from /chat to /chat/{clientId},
  // we need to use the temporary thread ID when we have a clientId but no server thread yet

  // Check for stored temp thread ID from branching
  const storedTempThreadId = currentClientId
    ? (sessionStorage.getItem(
        `branch_temp_thread_${currentClientId}`,
      ) as Id<"threads"> | null)
    : null

  // Use stored temp thread ID if available and we don't have a server thread yet
  if (storedTempThreadId && !currentThread && !tempThreadIdRef.current) {
    tempThreadIdRef.current = storedTempThreadId
    // Clean up stored value
    sessionStorage.removeItem(`branch_temp_thread_${currentClientId}`)
  }

  const messageThreadId =
    currentThread?._id ||
    (currentClientId && tempThreadIdRef.current) ||
    (isNewChat && tempThreadIdRef.current) || // Also check for new chat with temp thread
    null

  const rawMessages =
    useQuery(
      api.messages.list,
      messageThreadId ? { threadId: messageThreadId } : "skip",
    ) ?? []
  
  // Track previous messages to detect when optimistic messages are replaced
  const prevMessagesRef = useRef<typeof rawMessages>([])
  
  // Stabilize messages to prevent flickering during optimistic->real transitions
  const messages = useMemo(() => {
    const prev = prevMessagesRef.current
    const curr = rawMessages
    
    // If we have the same number of messages and they're just ID changes, preserve order
    if (prev.length === curr.length && prev.length > 0) {
      // Check if this is just an ID update (optimistic -> real)
      const lastPrevMsg = prev[0]
      const lastCurrMsg = curr[0]
      
      if (lastPrevMsg._id.startsWith('optimistic_') && 
          !lastCurrMsg._id.startsWith('optimistic_') &&
          lastPrevMsg.body === lastCurrMsg.body &&
          lastPrevMsg.messageType === lastCurrMsg.messageType) {
        // This is likely the optimistic message being replaced by the real one
        console.log("🔄 Detected optimistic->real transition, preserving order")
        // Return current messages but maintain visual stability
        prevMessagesRef.current = curr
        return curr
      }
    }
    
    prevMessagesRef.current = curr
    return curr
  }, [rawMessages])
  
  // DEBUG: Log when messages change
  useEffect(() => {
    console.log("📊 Messages state change:", {
      messageThreadId,
      messageCount: messages.length,
      messages: messages.map(m => ({
        id: m._id,
        type: m.messageType,
        body: m.body.slice(0, 30),
        isStreaming: m.isStreaming,
        isComplete: m.isComplete
      })),
      isNewChat,
      currentClientId,
      currentThread: currentThread?._id,
      tempThreadId: tempThreadIdRef.current
    })
  }, [messages, messageThreadId])

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

    // 3. Create optimistic message with a special prefix for tracking
    const optimisticId = `optimistic_${crypto.randomUUID()}` as Id<"messages">
    const optimisticMessage: Doc<"messages"> = {
      _id: optimisticId,
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
        const optimisticId = `optimistic_${crypto.randomUUID()}` as Id<"messages">
        const optimisticMessage: Doc<"messages"> = {
          _id: optimisticId,
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
