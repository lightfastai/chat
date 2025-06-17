"use client"

import { isClientId } from "@/lib/nanoid"
import { usePreloadedQuery, useQuery } from "convex/react"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { useChatPreloadContext } from "./ChatPreloadContext"

// Client component for dynamic chat title that updates based on current thread
export function ChatTitleClient() {
  // Get preloaded data from context
  const {
    preloadedThreadById,
    preloadedThreadByClientId,
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

  const currentThreadId = pathInfo.type === "threadId" ? pathInfo.id : "new"
  const currentClientId = pathInfo.type === "clientId" ? pathInfo.id : null
  const isSettingsPage = pathInfo.type === "settings"

  // Use preloaded thread data if available
  const preloadedThreadByIdData = preloadedThreadById
    ? usePreloadedQuery(preloadedThreadById)
    : null

  const preloadedThreadByClientIdData = preloadedThreadByClientId
    ? usePreloadedQuery(preloadedThreadByClientId)
    : null

  const preloadedThread =
    preloadedThreadByIdData || preloadedThreadByClientIdData

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

  const getTitle = () => {
    if (pathInfo.type === "new") {
      return "New Chat"
    }
    if (pathInfo.type === "settings") {
      return "Settings"
    }
    if (currentClientId && !currentThread) {
      return ""
    }
    return currentThread?.title || "Chat"
  }

  return <h1 className="text-lg font-semibold">{getTitle()}</h1>
}
