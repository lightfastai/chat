import { Icons } from "@/components/ui/icons"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { Preloaded } from "convex/react"
import { Plus } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import type { api } from "../../../../convex/_generated/api"
import { PreloadedUserDropdown } from "../../auth/PreloadedUserDropdown"
import { ActiveMenuItem } from "./ActiveMenuItem"
import { PreloadedThreadsList } from "./PreloadedThreadsList"

interface ServerSidebarImplementationProps {
  preloadedThreads: Preloaded<typeof api.threads.list>
  preloadedUser: Preloaded<typeof api.users.current>
}

// Main server component - renders static parts with reactive threads list
export function ServerSidebarImplementation({
  preloadedThreads,
  preloadedUser,
}: ServerSidebarImplementationProps) {
  return (
    <Sidebar variant="inset" className="w-64 max-w-64">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Link
            href="https://lightfast.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3"
          >
            <Icons.logo className="w-6 h-6 text-foreground" />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <ActiveMenuItem threadId="new" href="/chat" size="default">
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </ActiveMenuItem>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Only the threads list is a client component - everything else stays server-rendered */}
        <div className="w-full min-w-0">
          <Suspense
            fallback={
              <div className="px-3 py-8 text-center text-muted-foreground">
                <p className="text-sm">Loading conversations...</p>
              </div>
            }
          >
            <PreloadedThreadsList preloadedThreads={preloadedThreads} />
          </Suspense>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <PreloadedUserDropdown
          preloadedUser={preloadedUser}
          className="w-full justify-start"
        />
      </SidebarFooter>
    </Sidebar>
  )
}
