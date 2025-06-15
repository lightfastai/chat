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

  // Determine the actual Convex thread ID
  let threadId: Id<"threads"> | undefined
  if (isClient && threadByClientId) {
    threadId = threadByClientId._id
  } else if (urlThreadId && !isClient) {
    threadId = urlThreadId as Id<"threads">
  }

  return <ShareButton threadId={threadId} />
}
