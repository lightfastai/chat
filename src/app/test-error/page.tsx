"use client"

import { Button } from "@/components/ui/button"

export default function TestErrorPage() {
  const throwError = () => {
    throw new Error("This is a test error to demonstrate error boundaries!")
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Error Boundary Test Page</h1>
        <p className="text-muted-foreground">
          Click the button to trigger an error
        </p>
        <Button onClick={throwError} variant="destructive">
          Trigger Error
        </Button>
      </div>
    </div>
  )
}
