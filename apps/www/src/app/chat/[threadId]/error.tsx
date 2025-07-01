"use client"

import { captureException } from "@sentry/nextjs"
import { ArrowLeft, MessageSquareX, Plus, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import {
  type ErrorBoundaryAction,
  ErrorBoundaryUI,
} from "@/components/error/error-boundary-ui"

export default function ThreadError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to console and Sentry
    console.error("Thread error boundary caught:", error)
    captureException(error)
  }, [error])

  const handleGoBack = () => {
    router.back()
  }

  const handleNewChat = () => {
    router.push("/chat")
  }

  const isNotFound =
    error.message?.includes("not found") ||
    error.message?.includes("does not exist")

  const isPermissionError =
    error.message?.includes("permission") ||
    error.message?.includes("unauthorized")

  const title = isNotFound
    ? "Conversation Not Found"
    : "Unable to Load Conversation"

  const description = isNotFound
    ? "This conversation may have been deleted or the link may be incorrect."
    : isPermissionError
      ? "You don't have permission to view this conversation."
      : "We encountered an error while loading this conversation. Please try again."

  const actions = [
    !isNotFound && {
      label: "Try again",
      icon: RefreshCw,
      onClick: reset,
    },
    {
      label: "Go back",
      icon: ArrowLeft,
      onClick: handleGoBack,
    },
    {
      label: "New chat",
      icon: Plus,
      onClick: handleNewChat,
    },
  ].filter(Boolean) as ErrorBoundaryAction[]

  return (
    <ErrorBoundaryUI
      icon={MessageSquareX}
      title={title}
      description={description}
      error={error}
      actions={actions}
      className="h-[calc(100vh-4rem)]"
    />
  )
}
