"use client"

import { SidebarMenuItem } from "@/components/ui/sidebar"
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
  const href = `/chat/${thread.clientId || thread._id}`

  return (
    <SidebarMenuItem className="w-full">
      <a 
        href={href} 
        className="block px-2 py-1.5 text-sm rounded-md hover:bg-accent"
      >
        <div className="truncate max-w-[220px]">
          {thread.title}
        </div>
      </a>
    </SidebarMenuItem>
  )
}
