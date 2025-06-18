"use client"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { isClientId } from "@/lib/nanoid"
import { usePreloadedQuery, useQuery } from "convex/react"
import { usePathname } from "next/navigation"
import { useChatPreloadContext } from "./ChatPreloadContext"
import { ShareButton } from "./ShareButton"

export function ShareButtonWrapper() {
  // Get preloaded data from context
  const { preloadedThreadById, preloadedThreadByClientId, preloadedMessages } =
    useChatPreloadContext()
  const pathname = usePathname()

  // Extract threadId from pathname since useParams() doesn't update with window.history.replaceState()
  const urlThreadId = pathname.startsWith("/chat/")
    ? pathname.slice(6) // Remove "/chat/" prefix
    : undefined

  // Check if this is a new chat (no thread ID in URL)
  const isNewChat = pathname === "/chat"

  // Handle special routes
  const isSettingsPage =
    urlThreadId === "settings" || urlThreadId?.startsWith("settings/")

  // Check if it's a client-generated ID
  const isClient = urlThreadId ? isClientId(urlThreadId) : false

  // Use preloaded thread data if available
  const preloadedThreadByIdData = preloadedThreadById
    ? usePreloadedQuery(preloadedThreadById)
    : null

  const preloadedThreadByClientIdData = preloadedThreadByClientId
    ? usePreloadedQuery(preloadedThreadByClientId)
    : null

  const preloadedThread =
    preloadedThreadByIdData || preloadedThreadByClientIdData

  // Get thread by clientId if needed (skip for settings and if preloaded)
  const threadByClientId = useQuery(
    api.threads.getByClientId,
    isClient && urlThreadId && !isSettingsPage && !preloadedThread
      ? { clientId: urlThreadId }
      : "skip",
  )

  // Get thread by actual ID if needed (skip for settings and if preloaded)
  const threadById = useQuery(
    api.threads.get,
    urlThreadId && !isClient && !isSettingsPage && !preloadedThread
      ? { threadId: urlThreadId as Id<"threads"> }
      : "skip",
  )

  // Don't show share button on settings page
  if (isSettingsPage) {
    return null
  }

  // Determine the actual Convex thread ID
  let threadId: Id<"threads"> | undefined
  const currentThread = preloadedThread || threadByClientId || threadById
  if (currentThread) {
    threadId = currentThread._id
  }

  // Get messages to check if there's actual content
  const preloadedMessagesData = preloadedMessages
    ? usePreloadedQuery(preloadedMessages)
    : null

  // Query messages by clientId if we have one (skip for new chat)
  const messagesByClientId = useQuery(
    api.messages.listByClientId,
    isClient && urlThreadId && !preloadedMessagesData && !isNewChat
      ? { clientId: urlThreadId }
      : "skip",
  )

  // Query messages by threadId for regular threads (skip for new chat)
  const messagesByThreadId = useQuery(
    api.messages.list,
    threadId && !preloadedMessagesData && !isClient && !isNewChat
      ? { threadId }
      : "skip",
  )

  // Get actual messages
  const messages =
    preloadedMessagesData ?? messagesByClientId ?? messagesByThreadId ?? []

  // Check if there are any messages to share
  const hasShareableContent = messages.length > 0

  // Don't show share button if there's no content to share
  if (!hasShareableContent) {
    return null
  }

  return <ShareButton threadId={threadId} hasContent={hasShareableContent} />
}
