import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Plus } from "lucide-react"

// Skeleton loader for the sidebar - provides instant visual feedback
export function SidebarSkeleton() {
  return (
    <Sidebar variant="inset" className="w-64 max-w-64">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {/* Logo skeleton - match the actual logo dimensions */}
          <div className="w-6 h-6 flex items-center justify-center">
            <div className="w-full h-4 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {/* New Chat button skeleton - match ActiveMenuItem styling */}
                <SidebarMenuButton
                  size="default"
                  className="w-full max-w-full min-w-0 overflow-hidden"
                >
                  <div className="w-full max-w-full min-w-0 flex items-center overflow-hidden">
                    <Plus className="w-4 h-4" />
                    <span>New Chat</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Threads list container - match the actual implementation */}
        <div className="w-full min-w-0">
          <ScrollArea className="flex-1">
            {/* Loading skeleton for threads */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                <div className="w-12 h-3 bg-muted animate-pulse rounded" />
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {/* Skeleton thread items - match ThreadItem styling */}
                  {Array.from(
                    { length: 4 },
                    () =>
                      `skeleton-thread-${Math.random().toString(36).substr(2, 9)}`,
                  ).map((id) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuButton className="w-full max-w-full min-w-0 overflow-hidden h-auto py-2 px-2.5 text-left">
                        <div className="w-full max-w-full min-w-0 flex items-start gap-1.5 overflow-hidden">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="w-3/4 h-3.5 bg-muted animate-pulse rounded" />
                            <div className="w-full h-3 bg-muted/60 animate-pulse rounded" />
                          </div>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
                <div className="w-16 h-3 bg-muted animate-pulse rounded" />
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {Array.from(
                    { length: 3 },
                    () =>
                      `skeleton-older-${Math.random().toString(36).substr(2, 9)}`,
                  ).map((id) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuButton className="w-full max-w-full min-w-0 overflow-hidden h-auto py-2 px-2.5 text-left">
                        <div className="w-full max-w-full min-w-0 flex items-start gap-1.5 overflow-hidden">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="w-2/3 h-3.5 bg-muted animate-pulse rounded" />
                            <div className="w-5/6 h-3 bg-muted/60 animate-pulse rounded" />
                          </div>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </ScrollArea>
        </div>
      </SidebarContent>

      <SidebarFooter>
        {/* User dropdown skeleton - match UserDropdown button styling */}
        <div className="w-full h-10 px-2 flex items-center justify-between bg-muted/50 animate-pulse rounded-md">
          <div className="flex items-center gap-2">
            {/* Avatar skeleton */}
            <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
            {/* Username skeleton */}
            <div className="w-20 h-4 bg-muted animate-pulse rounded" />
          </div>
          {/* Chevron icon skeleton */}
          <div className="w-4 h-4 bg-muted animate-pulse rounded" />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
