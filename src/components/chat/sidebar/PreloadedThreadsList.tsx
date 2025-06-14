"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar"
import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react"
import { useCallback } from "react"
import { api } from "../../../../convex/_generated/api"
import type { Doc, Id } from "../../../../convex/_generated/dataModel"
import { ThreadItem } from "./ThreadItem"

type Thread = Doc<"threads">

interface PreloadedThreadsListProps {
  preloadedThreads: Preloaded<typeof api.threads.list>
}

// Separate pinned threads from unpinned threads
function separatePinnedThreads(threads: Thread[]) {
  const pinned: Thread[] = []
  const unpinned: Thread[] = []

  for (const thread of threads) {
    if (thread.pinned) {
      pinned.push(thread)
    } else {
      unpinned.push(thread)
    }
  }

  // Sort pinned threads by lastMessageAt (newest first)
  pinned.sort((a, b) => b.lastMessageAt - a.lastMessageAt)

  return { pinned, unpinned }
}

// Server-side function to group threads by date - no client needed
function groupThreadsByDate(threads: Thread[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const groups: Record<string, Thread[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    "This Month": [],
    Older: [],
  }

  for (const thread of threads) {
    const threadDate = new Date(thread.lastMessageAt)

    if (threadDate >= today) {
      groups.Today.push(thread)
    } else if (threadDate >= yesterday) {
      groups.Yesterday.push(thread)
    } else if (threadDate >= weekAgo) {
      groups["This Week"].push(thread)
    } else if (threadDate >= monthAgo) {
      groups["This Month"].push(thread)
    } else {
      groups.Older.push(thread)
    }
  }

  return groups
}

// Client component that only handles the reactive threads list
export function PreloadedThreadsList({
  preloadedThreads,
}: PreloadedThreadsListProps) {
  const togglePinned = useMutation(api.threads.togglePinned)

  try {
    // Use preloaded data with reactivity - this provides instant loading with real-time updates
    const threads = usePreloadedQuery(preloadedThreads)

    const { pinned, unpinned } = separatePinnedThreads(threads)
    const groupedThreads = groupThreadsByDate(unpinned)
    const categoryOrder = [
      "Today",
      "Yesterday",
      "This Week",
      "This Month",
      "Older",
    ]

    const handlePinToggle = useCallback(
      async (threadId: Id<"threads">) => {
        try {
          await togglePinned({ threadId })
        } catch (error) {
          console.error("Failed to toggle pin:", error)
        }
      },
      [togglePinned],
    )

    return (
      <ScrollArea className="h-[calc(100vh-280px)]" type="always">
        {threads.length === 0 ? (
          <div className="px-3 py-8 text-center text-muted-foreground">
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <>
            {/* Pinned threads section */}
            {pinned.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                  Pinned
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5 overflow-visible">
                    {pinned.map((thread) => (
                      <ThreadItem
                        key={thread._id}
                        thread={thread}
                        onPinToggle={handlePinToggle}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Regular threads grouped by date */}
            {categoryOrder.map((category) => {
              const categoryThreads = groupedThreads[category]
              if (!categoryThreads || categoryThreads.length === 0) {
                return null
              }

              return (
                <SidebarGroup key={category}>
                  <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                    {category}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-0.5 overflow-visible">
                      {categoryThreads.map((thread) => (
                        <ThreadItem
                          key={thread._id}
                          thread={thread}
                          onPinToggle={handlePinToggle}
                        />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )
            })}
          </>
        )}
      </ScrollArea>
    )
  } catch (error) {
    // If there's an error using preloaded data, show fallback
    console.warn("Error using preloaded threads data:", error)
    return (
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="px-3 py-8 text-center text-muted-foreground">
          <p className="text-sm">Unable to load conversations</p>
          <p className="text-xs mt-1">Please refresh the page</p>
        </div>
      </ScrollArea>
    )
  }
}
