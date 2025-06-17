"use client"

import { ErrorBoundaryUI } from "@/components/error/ErrorBoundaryUI"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import { useEffect } from "react"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("App error boundary caught:", error)
  }, [error])

  return (
    <ErrorBoundaryUI
      icon={AlertCircle}
      title="Something went wrong"
      description="We encountered an unexpected error. The issue has been logged and we'll look into it."
      error={error}
      actions={[
        {
          label: "Try again",
          icon: RefreshCw,
          onClick: reset,
        },
        {
          label: "Go home",
          icon: Home,
          href: "/",
        },
      ]}
      className="h-[calc(100vh-4rem)]"
    />
  )
}
