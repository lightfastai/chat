"use client"

import { useEffect } from "react"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function TestErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Test error boundary caught:", error)
  }, [error])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-amber-500/10 p-3">
          <AlertCircle className="h-6 w-6 text-amber-500" />
        </div>
        
        <h1 className="text-2xl font-semibold tracking-tight">
          Test Error Boundary Active!
        </h1>
        
        <p className="text-sm text-muted-foreground">
          This is the custom error boundary for the test-error route. Your error boundaries are working correctly!
        </p>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 w-full">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Error message: {error.message}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={reset} variant="default" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}