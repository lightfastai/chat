"use client"

import { ErrorBoundaryUI } from "@/components/error/ErrorBoundaryUI"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import { useEffect } from "react"

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
    <ErrorBoundaryUI
      icon={AlertCircle}
      iconColor="text-amber-500"
      title="Test Error Boundary Active!"
      description="This is the custom error boundary for the test-error route. Your error boundaries are working correctly!"
      error={error}
      showErrorDetails={true}
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
