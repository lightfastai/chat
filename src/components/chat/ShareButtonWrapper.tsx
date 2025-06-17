"use client"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { isClientId } from "@/lib/nanoid"
import { useQuery } from "convex/react"
import { useParams } from "next/navigation"
import { ShareButton } from "./ShareButton"

export function ShareButtonWrapper() {
  const params = useParams()
  const urlThreadId = params.threadId as string | undefined

  // Check if it's a client-generated ID
  const isClient = urlThreadId ? isClientId(urlThreadId) : false

  // Get thread by clientId if needed
  const threadByClientId = useQuery(
    api.threads.getByClientId,
    isClient && urlThreadId ? { clientId: urlThreadId } : "skip",
  )

  // Get thread by actual ID if needed
  const threadById = useQuery(
    api.threads.get,
    urlThreadId && !isClient
      ? { threadId: urlThreadId as Id<"threads"> }
      : "skip",
  )

  // Determine the actual Convex thread ID
  let threadId: Id<"threads"> | undefined
  const currentThread = threadByClientId || threadById
  if (currentThread) {
    threadId = currentThread._id
  }

  // Check for messages in the current chat to determine if it's shareable
  // For client IDs, we can check messages using the client ID as the thread ID
  // (optimistic updates store messages with client ID as the thread identifier)
  const messageThreadId = threadId || (isClient && urlThreadId ? urlThreadId as Id<"threads"> : null)
  const messages = useQuery(
    api.messages.list,
    messageThreadId ? { threadId: messageThreadId } : "skip",
  )

  // Chat is shareable if:
  // 1. We have a real Convex thread ID, OR
  // 2. We have messages (even with just client ID - optimistic updates)
  const hasShareableContent = Boolean(
    threadId || (messages && messages.length > 0),
  )

  return <ShareButton threadId={threadId} hasContent={hasShareableContent} />
}
