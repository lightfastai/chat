"use client"

import { Button } from "@/components/ui/button"
import { useQuery } from "convex/react"
import { ArrowLeft, GitBranch } from "lucide-react"
import Link from "next/link"
import { api } from "../../../convex/_generated/api"
import type { Doc } from "../../../convex/_generated/dataModel"

interface ThreadBreadcrumbProps {
  thread: Doc<"threads"> | null | undefined
}

export function ThreadBreadcrumb({ thread }: ThreadBreadcrumbProps) {
  const parentThread = useQuery(
    api.threads.get,
    thread?.parentThreadId ? { threadId: thread.parentThreadId } : "skip",
  )

  if (!thread?.parentThreadId || !parentThread) {
    return null
  }

  return (
    <div className="border-b bg-muted/30 px-4 py-2">
      <div className="flex items-center gap-2 max-w-3xl mx-auto">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Branched from:</span>
        <Button variant="ghost" size="sm" asChild className="h-auto p-1">
          <Link
            href={`/chat/${parentThread._id}`}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="text-sm font-medium truncate max-w-[200px]">
              {parentThread.title}
            </span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
