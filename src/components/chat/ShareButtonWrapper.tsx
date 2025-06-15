"use client"

import { useParams } from "next/navigation"
import { ShareButton } from "./ShareButton"

export function ShareButtonWrapper() {
  const params = useParams()
  const threadId = params.threadId as string | undefined

  return <ShareButton threadId={threadId} />
}
