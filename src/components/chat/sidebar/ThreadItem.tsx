"use client"

import { Button } from "@/components/ui/button"
import { SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Pin } from "lucide-react"
import { useCallback, useState } from "react"
import type { Id } from "../../../../convex/_generated/dataModel"
import { ActiveMenuItem } from "./ActiveMenuItem"

interface ThreadItemProps {
  thread: {
    _id: Id<"threads">
    clientId?: string
    title: string
    isTitleGenerating?: boolean
    pinned?: boolean
  }
  onPinToggle: (threadId: Id<"threads">) => void
}

export function ThreadItem({ thread, onPinToggle }: ThreadItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPinning, setIsPinning] = useState(false)

  const handlePinClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsPinning(true)
      try {
        await onPinToggle(thread._id)
      } finally {
        setIsPinning(false)
      }
    },
    [onPinToggle, thread._id],
  )

  return (
    <SidebarMenuItem
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ActiveMenuItem
        threadId={thread._id}
        href={`/chat/${thread.clientId || thread._id}`}
      >
        <span
          className={cn(
            "truncate text-sm font-medium flex-1 min-w-0",
            thread.isTitleGenerating && "animate-pulse blur-[0.5px] opacity-70",
          )}
        >
          {thread.title}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-5 w-5 ml-2 flex-shrink-0 transition-opacity",
            thread.pinned
              ? "opacity-100 text-primary"
              : isHovered
                ? "opacity-100 hover:text-primary"
                : "opacity-0",
          )}
          onClick={handlePinClick}
          disabled={isPinning}
        >
          <Pin
            className={cn(
              "h-3 w-3",
              thread.pinned && "fill-current",
              isPinning && "animate-pulse",
            )}
          />
        </Button>
      </ActiveMenuItem>
    </SidebarMenuItem>
  )
}
