import { preloadQuery } from "convex/nextjs"
import Link from "next/link"
import { Suspense } from "react"
import { api } from "../../../../convex/_generated/api"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "../../../components/ui/sidebar"
import { getAuthToken } from "../../../lib/auth"
import { ServerSidebarImplementation } from "./ServerSidebarImplementation"
import { SidebarSkeleton } from "./SidebarSkeleton"

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

// Server component wrapper for the sidebar that preloads threads for PPR
export async function ServerSidebar() {
  return (
    <Suspense fallback={<SidebarSkeleton />}>
      <SidebarWithPreloadedData />
    </Suspense>
  )
}

// Server component that handles data preloading with PPR optimization
async function SidebarWithPreloadedData() {
  try {
    // Get authentication token for server-side requests
    const token = await getAuthToken()

    // If no authentication token, render empty sidebar with prompt to sign in
    if (!token) {
      return <SidebarUnauthenticated />
    }

    // Preload threads data for PPR - this will be cached and streamed instantly
    const preloadedThreads = await preloadQuery(api.threads.list, {}, { token })

    // Pass preloaded data to server component - only threads list will be client-side
    return <ServerSidebarImplementation preloadedThreads={preloadedThreads} />
  } catch (error) {
    // Log error but still render - don't break the UI
    console.warn("Server-side thread preload failed:", error)

    // Fallback to loading state - client component will handle the error
    return <SidebarSkeleton />
  }
}

// Component for unauthenticated state
function SidebarUnauthenticated() {
  return (
    <Sidebar variant="inset">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <LightfastLogo className="w-6 h-6 text-foreground" />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="p-4 text-center text-muted-foreground">
          <p className="text-sm">Please sign in to view your chats</p>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-2">
          <Link
            href="/signin"
            className="flex items-center justify-center w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
