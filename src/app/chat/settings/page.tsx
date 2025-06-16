import { SettingsContent } from "@/components/settings/SettingsContent"
import { getAuthToken } from "@/lib/auth"
import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "../../../../convex/_generated/api"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings and preferences.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
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

    // Preload both user data and settings for instant tab switching
    const [preloadedUser, preloadedUserSettings] = await Promise.all([
      preloadQuery(api.users.current, {}, { token }),
      preloadQuery(api.userSettings.getUserSettings, {}, { token }),
    ])

    // Pass preloaded data to unified settings component
    return (
      <SettingsContent
        preloadedUser={preloadedUser}
        preloadedUserSettings={preloadedUserSettings}
      />
    )
  } catch (error) {
    console.error("Failed to load user data:", error)
    return <SettingsError />
  }
}

// Loading skeleton for settings
function SettingsSkeleton() {
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
function SettingsError() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Unable to load settings.</p>
      </div>
      <div className="border rounded-lg p-6 text-center text-muted-foreground">
        <p>Something went wrong. Please try refreshing the page.</p>
      </div>
    </div>
  )
}
