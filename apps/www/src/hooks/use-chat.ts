"use client"

import type { ModelId } from "@/lib/ai"
import { getProviderFromModelId } from "@/lib/ai"
import { isClientId, nanoid } from "@/lib/nanoid"
import {
  type Preloaded,
  useMutation,
  usePreloadedQuery,
  useQuery,
} from "convex/react"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { api } from "../../convex/_generated/api"
import type { Doc, Id } from "../../convex/_generated/dataModel"

interface UseChatOptions {
  preloadedThreadById?: Preloaded<typeof api.threads.get>
  preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>
  preloadedMessages?: Preloaded<typeof api.messages.list>
  preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>
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

  // Query messages by clientId if we have one (for optimistic updates)
  const messagesByClientId = useQuery(
    api.messages.listByClientId,
    currentClientId && !preloadedMessages
      ? { clientId: currentClientId }
      : "skip",
  )

  // Query messages by threadId for regular threads
  const messagesByThreadId = useQuery(
    api.messages.list,
    // Skip query if we have an optimistic thread ID to avoid validation errors
    messageThreadId &&
      !preloadedMessages &&
      !isOptimisticThreadId &&
      !currentClientId
      ? { threadId: messageThreadId }
      : "skip",
  )

  // Use messages in this priority order:
  // 1. Preloaded messages (SSR)
  // 2. Messages by clientId (for optimistic updates)
  // 3. Messages by threadId (regular case)
  // 4. Empty array fallback
  const messages =
    preloadedMessages ?? messagesByClientId ?? messagesByThreadId ?? []

  // Use preloaded user settings if available, otherwise query
  const preloadedUserSettings = options.preloadedUserSettings
    ? usePreloadedQuery(options.preloadedUserSettings)
    : null

  const userSettings = useQuery(
    api.userSettings.getUserSettings,
    preloadedUserSettings ? "skip" : {},
  )

  // Use whichever is available
  const finalUserSettings = preloadedUserSettings ?? userSettings

  // Remove debug logging for production
  // Uncomment the following for debugging message queries
  // useEffect(() => {
  //   console.log("🔍 useChat debug:", {
  //     pathname,
  //     currentClientId,
  //     currentThread: currentThread?._id,
  //     isOptimisticThreadId,
  //     messageThreadId,
  //     messageCount: messages.length,
  //     messagesByClientIdCount: messagesByClientId?.length,
  //     messagesByThreadIdCount: messagesByThreadId?.length,
  //     firstMessage: messages[0]?.body?.slice(0, 50),
  //     pathInfo,
  //   })
  // }, [
  //   pathname,
  //   currentClientId,
  //   currentThread?._id,
  //   isOptimisticThreadId,
  //   messageThreadId,
  //   messages.length,
  //   messagesByClientId?.length,
  //   messagesByThreadId?.length,
  //   pathInfo,
  // ])

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
      // Initialize usage field to match the server-side thread creation
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

    // Determine if user will use their own API key
    const provider = getProviderFromModelId(modelId as ModelId)
    const userSettingsData = localStore.getQuery(
      api.userSettings.getUserSettings,
      {},
    )

    // Default to false if settings not loaded yet
    // The actual determination will happen server-side
    let willUseUserApiKey = false

    // Only determine API key usage if settings are loaded
    if (userSettingsData !== undefined) {
      if (provider === "anthropic" && userSettingsData?.hasAnthropicKey) {
        willUseUserApiKey = true
      } else if (provider === "openai" && userSettingsData?.hasOpenAIKey) {
        willUseUserApiKey = true
      } else if (
        provider === "openrouter" &&
        userSettingsData?.hasOpenRouterKey
      ) {
        willUseUserApiKey = true
      }
    }

    // Log for debugging (can be removed in production)
    if (process.env.NODE_ENV === "development") {
      console.log("Optimistic update API key inference:", {
        provider,
        hasUserSettings: userSettingsData !== undefined,
        willUseUserApiKey,
      })
    }

    // Create optimistic assistant message placeholder
    // Important: Don't set thinkingStartedAt to avoid "Thinking" → "Thought for X.Xs" jump
    const optimisticAssistantMessage: Doc<"messages"> = {
      _id: crypto.randomUUID() as Id<"messages">,
      _creationTime: now + 1,
      threadId: optimisticThreadId,
      body: "", // Empty body for streaming
      messageType: "assistant",
      model: provider, // Add model field to match server structure
      modelId,
      timestamp: now + 1,
      isStreaming: true,
      isComplete: false,
      streamId: `stream_${clientId}_${now}`,
      // Don't set thinkingStartedAt to prevent premature "Thinking" display
      usedUserApiKey: willUseUserApiKey,
    }

    // Set optimistic messages for this thread
    // We use the optimistic thread ID here, which will be replaced when the real data arrives
    // Messages are returned in descending order (newest first) by the backend
    localStore.setQuery(api.messages.list, { threadId: optimisticThreadId }, [
      optimisticAssistantMessage, // Assistant message has timestamp now + 1
      optimisticUserMessage, // User message has timestamp now
    ])

    // IMPORTANT: Also set messages by clientId so they can be queried immediately
    localStore.setQuery(api.messages.listByClientId, { clientId }, [
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

        // Also update messages by clientId if we have one
        // This ensures optimistic updates work for threads accessed by clientId
        if (currentClientId) {
          const existingMessagesByClientId = localStore.getQuery(
            api.messages.listByClientId,
            { clientId: currentClientId },
          )
          if (existingMessagesByClientId !== undefined) {
            localStore.setQuery(
              api.messages.listByClientId,
              { clientId: currentClientId },
              [optimisticMessage, ...existingMessagesByClientId],
            )
          }
        }

        // Also update thread to show it's generating a response
        const existingThread = localStore.getQuery(api.threads.get, {
          threadId,
        })
        if (existingThread) {
          localStore.setQuery(
            api.threads.get,
            { threadId },
            {
              ...existingThread,
              isGenerating: true,
              lastMessageAt: now,
            },
          )
        }

        // Update threads list to move this thread to the top and show generating state
        const existingThreadsList = localStore.getQuery(api.threads.list, {})
        if (existingThreadsList) {
          const threadIndex = existingThreadsList.findIndex(
            (t) => t._id === threadId,
          )
          if (threadIndex >= 0) {
            const updatedThread = {
              ...existingThreadsList[threadIndex],
              isGenerating: true,
              lastMessageAt: now,
            }
            // Move thread to front and update its state
            const newThreadsList = [
              updatedThread,
              ...existingThreadsList.filter((_, i) => i !== threadIndex),
            ]
            localStore.setQuery(api.threads.list, {}, newThreadsList)
          }
        }
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

    // Ensure user settings are loaded before sending
    // This helps ensure the optimistic update has the data it needs
    if (finalUserSettings === undefined) {
      console.warn("User settings not loaded yet, waiting...")
      // In practice, this should rarely happen because we preload settings
      // But this ensures we don't create incorrect optimistic updates
      return
    }

    try {
      if (isNewChat) {
        // 🚀 Generate client ID for new chat
        const clientId = nanoid()

        // Update URL immediately without navigation events
        // Using window.history.replaceState like Vercel's AI chatbot for smoothest UX
        window.history.replaceState({}, "", `/chat/${clientId}`)

        // Create thread + send message atomically with optimistic updates
        await createThreadAndSend({
          title: "",
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
          title: "",
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
    userSettings: finalUserSettings,
  }
}
