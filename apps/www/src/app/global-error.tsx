"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global error boundary caught:", error)
  }, [error])

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "1rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          maxWidth: "28rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
          }}
        >
          <AlertTriangle
            style={{
              width: "1.5rem",
              height: "1.5rem",
              color: "#ef4444",
            }}
          />
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            margin: 0,
            color: "#0f172a",
          }}
        >
          Application Error
        </h1>

        <p
          style={{
            fontSize: "0.875rem",
            color: "#64748b",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          A critical error occurred that prevented the application from loading
          properly. Please try refreshing the page.
        </p>

        <button
          type="button"
          onClick={reset}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "white",
            backgroundColor: "#0f172a",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#1e293b"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#0f172a"
          }}
        >
          <RefreshCw style={{ width: "1rem", height: "1rem" }} />
          Try again
        </button>
      </div>
    </div>
  )
}
