"use client"

import { Button } from "@/components/ui/button"
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Pin } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useState, useMemo } from "react"
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
  const [isHovered, setIsHovered] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const pathname = usePathname()
  
  const href = `/chat/${thread.clientId || thread._id}`
  const isActive = useMemo(() => {
    return pathname === href
  }, [pathname, href])

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={href} className="block">
        <SidebarMenuButton 
          className="w-full h-auto p-2 text-left flex items-center justify-between"
          isActive={isActive}
        >
          <span 
            className={cn(
              "truncate flex-1 min-w-0",
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
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  )
}
