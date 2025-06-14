import { preloadQuery } from "convex/nextjs"
import { Suspense } from "react"
import { api } from "../../../../convex/_generated/api"
import { getAuthToken } from "../../../lib/auth"
import { ServerSidebarImplementation } from "./ServerSidebarImplementation"
import { SidebarSkeleton } from "./SidebarSkeleton"

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
    <div className="w-64 p-4 border-r">
      <div className="text-center text-muted-foreground">
        <p className="text-sm">Please sign in to view your chats</p>
      </div>
    </div>
  )
}
