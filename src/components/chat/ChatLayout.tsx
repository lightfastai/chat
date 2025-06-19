import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Suspense } from "react"
import { ChatTitleClient } from "./ChatTitleClient"
import { ShareButtonWrapper } from "./ShareButtonWrapper"
import { ServerSidebar } from "./sidebar/ServerSidebar"

// Server component for chat header - can be static with PPR
function ChatHeader() {
  return (
    <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 px-2 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Suspense
          fallback={<div className="h-6 w-24 bg-muted animate-pulse rounded" />}
        >
          <ChatTitleClient />
        </Suspense>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {/* <Suspense
          fallback={
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 bg-muted animate-pulse rounded" />
              <div className="h-6 w-20 bg-muted animate-pulse rounded" />
            </div>
          }
        >
          <TokenUsageHeaderWrapper />
        </Suspense> */}
        <Suspense
          fallback={<div className="h-8 w-16 bg-muted animate-pulse rounded" />}
        >
          <ShareButtonWrapper />
        </Suspense>
      </div>
    </header>
  )
}

interface ChatLayoutProps {
  children: React.ReactNode
}

// Main server layout component
export function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <ServerSidebar />
        <SidebarInset className="flex flex-col border-l border-r-0 border-t border-b">
          <ChatHeader />
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
