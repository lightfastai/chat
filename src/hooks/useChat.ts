"use client"

import type { ModelId } from "@/lib/ai/types"
import { isClientId, nanoid } from "@/lib/nanoid"
import { useMutation, useQuery } from "convex/react"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef } from "react"
import { api } from "../../convex/_generated/api"
import type { Doc, Id } from "../../convex/_generated/dataModel"

// Simplified approach - no complex client message queue

export function useChat() {
  const pathname = usePathname()

  // Store the temporary thread ID to maintain consistency across URL changes
  const tempThreadIdRef = useRef<Id<"threads"> | null>(null)
  // Store previous pathname to detect navigation changes
  const prevPathnameRef = useRef(pathname)
  
  // Remove complex client message queue - keep it simple

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

  // Simple approach: only query when we have a real server thread
  const messageThreadId = currentThread?._id || null

  const rawMessages =
    useQuery(
      api.messages.list,
      messageThreadId ? { threadId: messageThreadId } : "skip",
    ) ?? []

  // No complex message stabilization - just use raw messages
  const messages = rawMessages

  // DEBUG: Log when messages change
  useEffect(() => {
    console.log("📊 Messages state change:", {
      messageThreadId,
      messageCount: messages.length,
      messages: messages.map((m) => ({
        id: m._id,
        type: m.messageType,
        body: m.body.slice(0, 30),
        isStreaming: m.isStreaming,
        isComplete: m.isComplete,
      })),
      isNewChat,
      currentClientId,
      currentThread: currentThread?._id,
      tempThreadId: tempThreadIdRef.current,
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

  // Simplified mutation without complex optimistic updates
  const createThreadAndSend = useMutation(api.messages.createThreadAndSend)

  // Simplified mutation without optimistic updates to prevent flickering
  const sendMessage = useMutation(api.messages.send)

  const handleSendMessage = async (
    message: string,
    modelId: string,
    attachments?: Id<"files">[],
    webSearchEnabled?: boolean,
  ) => {
    if (!message.trim()) return

    try {
      if (isNewChat) {
        // Simple approach: just create thread and let server handle everything
        const clientId = nanoid()
        
        // Only update URL after successful creation
        const threadId = await createThreadAndSend({
          title: "Generating title...",
          clientId: clientId,
          body: message,
          modelId: modelId as ModelId,
          attachments,
          webSearchEnabled,
        })
        
        // Navigate to the new thread after creation
        window.history.replaceState({}, "", `/chat/${clientId}`)
        return
      }

      if (currentClientId && !currentThread) {
        // Create thread with existing clientId
        await createThreadAndSend({
          title: "Generating title...",
          clientId: currentClientId,
          body: message,
          modelId: modelId as ModelId,
          attachments,
          webSearchEnabled,
        })
      } else if (currentThread) {
        // Send message to existing thread
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
