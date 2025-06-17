"use client"

import { ErrorBoundaryUI } from "@/components/error/ErrorBoundaryUI"
import { FileQuestion, Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <ErrorBoundaryUI
      icon={FileQuestion}
      iconColor="text-blue-500"
      title="Page not found"
      description="Sorry, we couldn't find the page you're looking for. It might have been moved or deleted."
      actions={[
        {
          label: "Go home",
          icon: Home,
          href: "/",
        },
        {
          label: "Search docs",
          icon: Search,
          href: "/docs",
          variant: "outline",
        },
      ]}
      className="h-[calc(100vh-4rem)]"
    />
  )
}
