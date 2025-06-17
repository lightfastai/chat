"use client"

import { isClientId } from "@/lib/nanoid"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { TokenUsageHeader } from "./TokenUsageHeader"

export function TokenUsageHeaderWrapper() {
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

  // Resolve client ID to actual thread ID
  const threadByClientId = useQuery(
    api.threads.getByClientId,
    pathInfo.type === "clientId" ? { clientId: pathInfo.id } : "skip",
  )

  // Determine the actual thread ID
  const currentThreadId: Id<"threads"> | "new" = useMemo(() => {
    if (pathInfo.type === "threadId") {
      return pathInfo.id as Id<"threads">
    }
    if (pathInfo.type === "clientId" && threadByClientId) {
      return threadByClientId._id
    }
    return "new"
  }, [pathInfo, threadByClientId])


  // Don't show token usage on settings page
  if (pathInfo.type === "settings") {
    return null
  }

  return <TokenUsageHeader threadId={currentThreadId} />
}
