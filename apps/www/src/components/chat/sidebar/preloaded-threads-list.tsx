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
import { toast } from "sonner"
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
          await togglePinned.withOptimisticUpdate((localStore, args) => {
            // Get the current threads list
            const currentThreads = localStore.getQuery(api.threads.list)
            if (!currentThreads) return

            // Find the thread being toggled
            const threadIndex = currentThreads.findIndex(
              (t) => t._id === args.threadId,
            )
            if (threadIndex === -1) return

            // Create a new array with the updated thread
            const updatedThreads = [...currentThreads]
            const thread = { ...updatedThreads[threadIndex] }
            thread.pinned = !thread.pinned
            updatedThreads[threadIndex] = thread

            // Update the query result
            localStore.setQuery(api.threads.list, {}, updatedThreads)
          })({ threadId })
        } catch (error) {
          console.error("Failed to toggle pin:", error)
          toast.error("Failed to update pin status. Please try again.")
        }
      },
      [togglePinned],
    )

    return (
      <ScrollArea className="h-[calc(100vh-280px)] w-full">
        <div className="w-full max-w-full min-w-0 overflow-hidden">
          {threads.length === 0 ? (
            <div className="px-3 py-8 text-center text-muted-foreground">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <>
              {/* Pinned threads section */}
              {pinned.length > 0 && (
                <SidebarGroup className="w-58">
                  <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                    Pinned
                  </SidebarGroupLabel>
                  <SidebarGroupContent className="w-full max-w-full overflow-hidden">
                    <SidebarMenu className="space-y-0.5">
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
                  <SidebarGroup key={category} className="w-58">
                    <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                      {category}
                    </SidebarGroupLabel>
                    <SidebarGroupContent className="w-full max-w-full overflow-hidden">
                      <SidebarMenu className="space-y-0.5">
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
        </div>
      </ScrollArea>
    )
  } catch (error) {
    // If there's an error using preloaded data, show fallback
    console.warn("Error using preloaded threads data:", error)
    return (
      <ScrollArea className="h-[calc(100vh-280px)] w-full max-w-full">
        <div className="px-3 py-8 text-center text-muted-foreground">
          <p className="text-sm">Unable to load conversations</p>
          <p className="text-xs mt-1">Please refresh the page</p>
        </div>
      </ScrollArea>
    )
  }
}
