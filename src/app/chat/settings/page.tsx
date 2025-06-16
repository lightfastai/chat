import { ProfileSectionWithPreload } from "@/components/settings/ProfileSectionWithPreload"
import { getAuthToken } from "@/lib/auth"
import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "../../../../convex/_generated/api"

export const metadata: Metadata = {
  title: "Profile - Settings",
  description: "View and manage your profile information.",
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SettingsPage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <SettingsPageWithData />
    </Suspense>
  )
}

async function SettingsPageWithData() {
  try {
    // Get authentication token for server-side requests
    const token = await getAuthToken()

    // Middleware ensures authentication, so token should exist
    if (!token) {
      throw new Error("Authentication required")
    }

    // Preload user data for PPR - this will be cached and streamed instantly
    const preloadedUser = await preloadQuery(api.users.current, {}, { token })

    // Pass preloaded data to client component
    return <ProfileSectionWithPreload preloadedUser={preloadedUser} />
  } catch (error) {
    console.error("Failed to load user data:", error)
    return <ProfileError />
  }
}

// Loading skeleton for profile
function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
      </div>
      <div className="border rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="h-16 w-16 bg-muted rounded-full animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Error state
function ProfileError() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Unable to load profile information.
        </p>
      </div>
      <div className="border rounded-lg p-6 text-center text-muted-foreground">
        <p>Something went wrong. Please try refreshing the page.</p>
      </div>
    </div>
  )
}
