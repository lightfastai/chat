"use client"

import { isClientId } from "@/lib/nanoid"
import { usePreloadedQuery, useQuery } from "convex/react"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { useChatPreloadContext } from "./chat-preload-context"
import { TokenUsageDialog } from "./token-usage-dialog"

export function TokenUsageHeaderWrapper() {
  // Get preloaded data from context
  const {
    preloadedThreadById,
    preloadedThreadByClientId,
    preloadedThreadUsage,
  } = useChatPreloadContext()
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

  // Use preloaded thread data if available
  const preloadedThreadByIdData = preloadedThreadById
    ? usePreloadedQuery(preloadedThreadById)
    : null

  const preloadedThreadByClientIdData = preloadedThreadByClientId
    ? usePreloadedQuery(preloadedThreadByClientId)
    : null

  const preloadedThread =
    preloadedThreadByIdData || preloadedThreadByClientIdData

  // Resolve client ID to actual thread ID (skip if we have preloaded data)
  const threadByClientId = useQuery(
    api.threads.getByClientId,
    pathInfo.type === "clientId" && !preloadedThread
      ? { clientId: pathInfo.id }
      : "skip",
  )

  // Determine the actual thread ID
  const currentThreadId: Id<"threads"> | "new" = useMemo(() => {
    if (pathInfo.type === "threadId") {
      return pathInfo.id as Id<"threads">
    }
    if (pathInfo.type === "clientId") {
      const thread = preloadedThreadByClientIdData || threadByClientId
      if (thread) {
        return thread._id
      }
    }
    return "new"
  }, [pathInfo, preloadedThreadByClientIdData, threadByClientId])

  // Don't show token usage on settings page
  if (pathInfo.type === "settings") {
    return null
  }

  return (
    <TokenUsageDialog
      threadId={currentThreadId}
      preloadedThreadUsage={preloadedThreadUsage}
    />
  )
}
