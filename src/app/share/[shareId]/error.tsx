"use client"

import { Home, MessageSquare, RefreshCw, Share2 } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function ShareError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Share error boundary caught:", error)
  }, [error])

  const isNotFound =
    error.message?.includes("not found") ||
    error.message?.includes("does not exist")

  const isExpired = error.message?.includes("expired")

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <Share2 className="h-6 w-6 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          {isNotFound
            ? "Shared Conversation Not Found"
            : isExpired
              ? "Share Link Expired"
              : "Unable to Load Shared Conversation"}
        </h1>

        <p className="text-sm text-muted-foreground">
          {isNotFound
            ? "This shared conversation may have been deleted or the link may be incorrect."
            : isExpired
              ? "This share link has expired. Please request a new one from the conversation owner."
              : "We encountered an error while loading this shared conversation. Please try again."}
        </p>

        {process.env.NODE_ENV === "development" && error.message && (
          <details className="mt-4 w-full rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-destructive">
              Error details
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
              {error.message}
            </pre>
          </details>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {!isNotFound && !isExpired && (
            <Button onClick={reset} variant="default" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}

          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm">
            <Link href="/chat">
              <MessageSquare className="mr-2 h-4 w-4" />
              Start new chat
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
