"use client"

import { ArrowLeft, MessageSquareX, Plus, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function ThreadError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Thread error boundary caught:", error)
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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <MessageSquareX className="h-6 w-6 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          {isNotFound
            ? "Conversation Not Found"
            : "Unable to Load Conversation"}
        </h1>

        <p className="text-sm text-muted-foreground">
          {isNotFound
            ? "This conversation may have been deleted or the link may be incorrect."
            : isPermissionError
              ? "You don't have permission to view this conversation."
              : "We encountered an error while loading this conversation. Please try again."}
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
          {!isNotFound && (
            <Button onClick={reset} variant="default" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}

          <Button onClick={handleGoBack} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>

          <Button onClick={handleNewChat} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New chat
          </Button>
        </div>
      </div>
    </div>
  )
}
