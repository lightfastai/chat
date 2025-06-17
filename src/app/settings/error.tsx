"use client"

import { Home, RefreshCw, Settings } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Settings error boundary caught:", error)
  }, [error])

  const isAuthError =
    error.message?.includes("unauthorized") ||
    error.message?.includes("authentication") ||
    error.message?.includes("sign in")

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <Settings className="h-6 w-6 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          {isAuthError ? "Authentication Required" : "Settings Error"}
        </h1>

        <p className="text-sm text-muted-foreground">
          {isAuthError
            ? "You need to sign in to access your settings."
            : "We encountered an error while loading your settings. Please try again."}
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

        <div className="flex gap-2">
          {!isAuthError && (
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

          {isAuthError && (
            <Button asChild variant="default" size="sm">
              <Link href="/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
