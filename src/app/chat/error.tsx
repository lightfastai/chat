"use client"

import { MessageSquareOff, Plus, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Chat error boundary caught:", error)
  }, [error])

  const handleNewChat = () => {
    router.push("/chat")
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <MessageSquareOff className="h-6 w-6 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Chat Error</h1>

        <p className="text-sm text-muted-foreground">
          We encountered an error while loading the chat. This might be due to a
          connection issue or the chat might no longer be available.
        </p>

        {error.message?.includes("Thread not found") && (
          <p className="text-sm text-muted-foreground">
            This conversation may have been deleted or you may not have
            permission to access it.
          </p>
        )}

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

        <div className="flex gap-2">
          <Button onClick={reset} variant="default" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
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
