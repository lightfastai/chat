"use client"

import { captureException } from "@sentry/nextjs"
import { Home, MessageSquare, RefreshCw, Share2 } from "lucide-react"
import { useEffect } from "react"

import {
  type ErrorBoundaryAction,
  ErrorBoundaryUI,
} from "@/components/error/error-boundary-ui"

export default function ShareError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console and Sentry
    console.error("Share error boundary caught:", error)
    captureException(error)
  }, [error])

  const isNotFound =
    error.message?.includes("not found") ||
    error.message?.includes("does not exist")

  const isExpired = error.message?.includes("expired")

  const title = isNotFound
    ? "Shared Conversation Not Found"
    : isExpired
      ? "Share Link Expired"
      : "Unable to Load Shared Conversation"

  const description = isNotFound
    ? "This shared conversation may have been deleted or the link may be incorrect."
    : isExpired
      ? "This share link has expired. Please request a new one from the conversation owner."
      : "We encountered an error while loading this shared conversation. Please try again."

  const actions = [
    !isNotFound &&
      !isExpired && {
        label: "Try again",
        icon: RefreshCw,
        onClick: reset,
      },
    {
      label: "Go home",
      icon: Home,
      href: "/",
    },
    {
      label: "Start new chat",
      icon: MessageSquare,
      href: "/chat",
    },
  ].filter(Boolean) as ErrorBoundaryAction[]

  return (
    <ErrorBoundaryUI
      icon={Share2}
      title={title}
      description={description}
      error={error}
      actions={actions}
      className="h-[calc(100vh-4rem)]"
    />
  )
}
