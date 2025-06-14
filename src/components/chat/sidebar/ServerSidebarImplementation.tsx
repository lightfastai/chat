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
import { UserDropdown } from "../../auth/UserDropdown"
import { ActiveMenuItem } from "./ActiveMenuItem"
import { PreloadedThreadsList } from "./PreloadedThreadsList"

interface ServerSidebarImplementationProps {
  preloadedThreads: Preloaded<typeof api.threads.list>
}

// Lightfast logo component - server-rendered
function LightfastLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="104"
      height="70"
      viewBox="0 0 104 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lightfast"
      {...props}
    >
      <title>Lightfast</title>
      <path
        d="M15.3354 57.3195H47.1597V69.7863H0.543457V0.632019H15.3354V57.3195Z"
        fill="currentColor"
      />
      <path
        d="M79.6831 69.7863H65.2798L89.0532 0.658386H103.457L79.6831 69.7863Z"
        fill="currentColor"
      />
    </svg>
  )
}

// Main server component - renders static parts with reactive threads list
export function ServerSidebarImplementation({
  preloadedThreads,
}: ServerSidebarImplementationProps) {
  return (
    <Sidebar variant="inset" className="w-64">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <LightfastLogo className="w-6 h-6 text-foreground" />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <ActiveMenuItem
                  threadId="new"
                  href="/chat"
                  className="h-10 w-full"
                  size="default"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </ActiveMenuItem>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Only the threads list is a client component - everything else stays server-rendered */}
        <Suspense
          fallback={
            <div className="px-3 py-8 text-center text-muted-foreground">
              <p className="text-sm">Loading conversations...</p>
            </div>
          }
        >
          <PreloadedThreadsList preloadedThreads={preloadedThreads} />
        </Suspense>
      </SidebarContent>

      <SidebarFooter>
        <UserDropdown className="w-full justify-start" />
      </SidebarFooter>
    </Sidebar>
  )
}
