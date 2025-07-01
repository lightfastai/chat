"use client"

import { captureException } from "@sentry/nextjs"
import { MessageSquareOff, Plus, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { ErrorBoundaryUI } from "@/components/error/error-boundary-ui"

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to console and Sentry
    console.error("Chat error boundary caught:", error)
    captureException(error)
  }, [error])

  const handleNewChat = () => {
    router.push("/chat")
  }

  const details = error.message?.includes("Thread not found")
    ? "This conversation may have been deleted or you may not have permission to access it."
    : undefined

  return (
    <ErrorBoundaryUI
      icon={MessageSquareOff}
      title="Chat Error"
      description="We encountered an error while loading the chat. This might be due to a connection issue or the chat might no longer be available."
      details={details}
      error={error}
      actions={[
        {
          label: "Try again",
          icon: RefreshCw,
          onClick: reset,
        },
        {
          label: "New chat",
          icon: Plus,
          onClick: handleNewChat,
        },
      ]}
      className="h-[calc(100vh-4rem)]"
    />
  )
}
