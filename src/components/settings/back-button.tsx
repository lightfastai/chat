"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface BackButtonProps {
  fallbackHref?: string
  children?: React.ReactNode
}

export function BackButton({ fallbackHref = "/", children }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back()
    } else {
      // Fallback to specific route if no history
      router.push(fallbackHref)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="gap-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {children || "Back"}
    </Button>
  )
}
