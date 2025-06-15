"use client"

import { Button } from "@/components/ui/button"
import { SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Pin } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useState } from "react"
import type { Id } from "../../../../convex/_generated/dataModel"

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
  const pathname = usePathname()
  const [isHovered, setIsHovered] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  
  const href = `/chat/${thread.clientId || thread._id}`
  const isActive = pathname === href

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
      className="w-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link 
        href={href} 
        className={cn(
          "block px-2 py-1.5 text-sm rounded-md hover:bg-accent",
          isActive && "bg-accent font-medium"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className={cn(
            "truncate max-w-[180px]", // Back to explicit width
            thread.isTitleGenerating && "animate-pulse blur-[0.5px] opacity-70"
          )}>
            {thread.title}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-5 w-5 flex-shrink-0 transition-opacity ml-auto", // Added ml-auto
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
        </div>
      </Link>
    </SidebarMenuItem>
  )
}
