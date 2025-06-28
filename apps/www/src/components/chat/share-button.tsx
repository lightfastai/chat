"use client"

import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@lightfast/ui/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lightfast/ui/components/ui/tooltip"
import { Share } from "lucide-react"
import { useState } from "react"
import { ShareDialog } from "./share-dialog"

interface ShareButtonProps {
  threadId?: Id<"threads">
  hasContent?: boolean
}

export function ShareButton({
  threadId,
  hasContent = false,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const isDisabled = !hasContent
  const isLoading = hasContent && !threadId // Has content but thread not ready yet

  const button = (
    <Button
      variant="ghost"
      onClick={() => !isDisabled && threadId && setIsOpen(true)}
      disabled={isDisabled}
      className="h-8 px-2 gap-1.5"
    >
      <Share className="w-4 h-4" />
      <span className="hidden sm:inline text-xs">Share</span>
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

  if (isLoading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>Preparing chat for sharing...</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <>
      {button}
      <ShareDialog
        threadId={threadId!}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  )
}
