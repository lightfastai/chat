import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { Preloaded } from "convex/react"
import { Suspense } from "react"
import type { api } from "../../../convex/_generated/api"
import { ChatTitleClient } from "./ChatTitleClient"
import { ShareButtonWrapper } from "./ShareButtonWrapper"
import { TokenUsageHeaderWrapper } from "./TokenUsageHeaderWrapper"
import { ServerSidebar } from "./sidebar/ServerSidebar"

interface ChatHeaderProps {
  preloadedThreadById?: Preloaded<typeof api.threads.get>
  preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>
  preloadedThreadUsage?: Preloaded<typeof api.messages.getThreadUsage>
}

// Server component for chat header - can be static with PPR
function ChatHeader({
  preloadedThreadById,
  preloadedThreadByClientId,
  preloadedThreadUsage,
}: ChatHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2 flex-1">
        <Suspense
          fallback={<div className="h-6 w-24 bg-muted animate-pulse rounded" />}
        >
          <ChatTitleClient
            preloadedThreadById={preloadedThreadById}
            preloadedThreadByClientId={preloadedThreadByClientId}
          />
        </Suspense>
      </div>
      <div className="flex items-center gap-2">
        <Suspense
          fallback={
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 bg-muted animate-pulse rounded" />
              <div className="h-6 w-20 bg-muted animate-pulse rounded" />
            </div>
          }
        >
          <TokenUsageHeaderWrapper
            preloadedThreadById={preloadedThreadById}
            preloadedThreadByClientId={preloadedThreadByClientId}
            preloadedThreadUsage={preloadedThreadUsage}
          />
        </Suspense>
        <Suspense
          fallback={<div className="h-8 w-16 bg-muted animate-pulse rounded" />}
        >
          <ShareButtonWrapper
            preloadedThreadById={preloadedThreadById}
            preloadedThreadByClientId={preloadedThreadByClientId}
          />
        </Suspense>
      </div>
    </header>
  )
}

interface ChatLayoutProps {
  children: React.ReactNode
  preloadedThreadById?: Preloaded<typeof api.threads.get>
  preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>
  preloadedThreadUsage?: Preloaded<typeof api.messages.getThreadUsage>
}

// Main server layout component
export function ChatLayout({
  children,
  preloadedThreadById,
  preloadedThreadByClientId,
  preloadedThreadUsage,
}: ChatLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <ServerSidebar />
        <SidebarInset className="flex flex-col border-l border-r-0 border-t border-b">
          <ChatHeader
            preloadedThreadById={preloadedThreadById}
            preloadedThreadByClientId={preloadedThreadByClientId}
            preloadedThreadUsage={preloadedThreadUsage}
          />
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
