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
    <Sidebar variant="inset" className="w-64">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {/* Logo skeleton */}
          <div className="w-6 h-6 bg-muted animate-pulse rounded" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {/* New Chat button - static, can render immediately */}
                <SidebarMenuButton size="default" className="h-10 w-full">
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <ScrollArea className="h-[calc(100vh-280px)]">
          {/* Loading skeleton for threads */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground">
              <div className="w-12 h-3 bg-muted animate-pulse rounded" />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {/* Skeleton thread items */}
                {Array.from(
                  { length: 5 },
                  () =>
                    `skeleton-thread-${Math.random().toString(36).substr(2, 9)}`,
                ).map((id) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton className="w-full h-auto p-2.5 text-left">
                      <div className="w-full h-4 bg-muted animate-pulse rounded" />
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
                    <SidebarMenuButton className="w-full h-auto p-2.5 text-left">
                      <div className="w-full h-4 bg-muted animate-pulse rounded" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        {/* User dropdown skeleton */}
        <div className="w-full h-10 bg-muted animate-pulse rounded" />
      </SidebarFooter>
    </Sidebar>
  )
}
