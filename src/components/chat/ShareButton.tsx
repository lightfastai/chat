"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Id } from "@/convex/_generated/dataModel"
import { Share2 } from "lucide-react"
import { useState } from "react"
import { ShareDialog } from "./ShareDialog"

interface ShareButtonProps {
  threadId?: Id<"threads">
}

export function ShareButton({ threadId }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const isDisabled = !threadId
  const button = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => !isDisabled && setIsOpen(true)}
      disabled={isDisabled}
      className="gap-2"
    >
      <Share2 className="h-4 w-4" />
      <span className="hidden sm:inline">Share</span>
    </Button>
  )

  if (isDisabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>Start a conversation to share this chat</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <>
      {button}
      <ShareDialog threadId={threadId} open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
