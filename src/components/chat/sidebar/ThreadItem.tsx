"use client"

import { SidebarMenuAction, SidebarMenuItem } from "@/components/ui/sidebar"
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
    <SidebarMenuItem className="w-full max-w-full min-w-0 overflow-hidden">
      <ActiveMenuItem
        threadId={thread._id}
        href={`/chat/${thread.clientId || thread._id}`}
      >
        <span
          className={cn(
            "font-medium truncate text-ellipsis overflow-hidden min-w-0 flex-1",
            thread.isTitleGenerating && "animate-pulse blur-[0.5px] opacity-70",
          )}
        >
          {thread.title}
        </span>
      </ActiveMenuItem>
      <SidebarMenuAction
        showOnHover
        onClick={handlePinClick}
        disabled={isPinning}
        className={cn(
          thread.pinned && "text-primary",
          // Prevent focus ring overflow
          "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-ring",
        )}
      >
        <Pin
          className={cn(
            "h-3 w-3",
            thread.pinned && "fill-current",
            isPinning && "animate-pulse",
          )}
        />
      </SidebarMenuAction>
    </SidebarMenuItem>
  )
}
