"use client"

import { Button } from "@/components/ui/button"
import type { Id } from "@/convex/_generated/dataModel"
import { Share2 } from "lucide-react"
import { useState } from "react"
import { ShareDialog } from "./ShareDialog"

interface ShareButtonProps {
  threadId?: Id<"threads">
}

export function ShareButton({ threadId }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!threadId) {
    return null
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>
      <ShareDialog threadId={threadId} open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
