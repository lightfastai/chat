"use client"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { isClientId } from "@/lib/nanoid"
import { useQuery } from "convex/react"
import { usePathname } from "next/navigation"
import { ShareButton } from "./ShareButton"

export function ShareButtonWrapper() {
  const pathname = usePathname()

  // Extract threadId from pathname since useParams() doesn't update with window.history.replaceState()
  const urlThreadId = pathname.startsWith("/chat/")
    ? pathname.slice(6) // Remove "/chat/" prefix
    : undefined

  // Handle special routes
  const isSettingsPage =
    urlThreadId === "settings" || urlThreadId?.startsWith("settings/")

  // Check if it's a client-generated ID
  const isClient = urlThreadId ? isClientId(urlThreadId) : false
  const isNewChat = pathname === "/chat"

  // Get thread by clientId if needed (skip for settings)
  const threadByClientId = useQuery(
    api.threads.getByClientId,
    isClient && urlThreadId && !isSettingsPage
      ? { clientId: urlThreadId }
      : "skip",
  )

  // Get thread by actual ID if needed (skip for settings)
  const threadById = useQuery(
    api.threads.get,
    urlThreadId && !isClient && !isSettingsPage
      ? { threadId: urlThreadId as Id<"threads"> }
      : "skip",
  )

  // Don't show share button on settings page
  if (isSettingsPage) {
    return null
  }

  // Determine the actual Convex thread ID
  let threadId: Id<"threads"> | undefined
  const currentThread = threadByClientId || threadById
  if (currentThread) {
    threadId = currentThread._id
  }

  // For content detection:
  // - If we have a real thread, it definitely has content
  // - If we're on /chat/{clientId}, assume there's content (user must have sent a message to get here)
  // - If we're on /chat, there's no content yet
  // Using pathname to ensure we react to URL changes from window.history.replaceState()
  const hasShareableContent = Boolean(
    threadId || // Real thread exists - definitely has content
      (!isNewChat && isClient && urlThreadId), // Not on /chat AND client ID URL - user sent message
  )

  return <ShareButton threadId={threadId} hasContent={hasShareableContent} />
}
