import { preloadQuery } from "convex/nextjs"
import { Suspense } from "react"
import { api } from "../../../../convex/_generated/api"
import { getAuthToken } from "../../../lib/auth"
import { ServerSidebarImplementation } from "./ServerSidebarImplementation"
import { SidebarSkeleton } from "./SidebarSkeleton"
import { GuestSidebarWrapper } from "./GuestSidebarWrapper"

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

    // Preload user data for PPR - this will be cached and streamed instantly
    const preloadedUser = await preloadQuery(api.users.current, {}, { token })

    // Pass preloaded data to server component - only threads list will be client-side
    return (
      <ServerSidebarImplementation
        preloadedThreads={preloadedThreads}
        preloadedUser={preloadedUser}
      />
    )
  } catch (error) {
    // Log error but still render - don't break the UI
    console.warn("Server-side thread preload failed:", error)

    // Fallback to loading state - client component will handle the error
    return <SidebarSkeleton />
  }
}

// Component for unauthenticated state - now uses client-side guest sidebar
function SidebarUnauthenticated() {
  return <GuestSidebarWrapper />
}
