import { SettingsContent } from "@/components/settings/SettingsContent"
import { ScrollArea } from "@/components/ui/scroll-area"
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
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<SettingsSkeleton />}>
          <SettingsPageWithData />
        </Suspense>
      </div>
    </ScrollArea>
  )
}

async function SettingsPageWithData() {
  // Get authentication token for server-side requests
  const token = await getAuthToken()

  // Middleware ensures authentication, so token should exist
  if (!token) {
    return <SettingsError />
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
}

// Helper for skeleton row
function SkeletonRow({ controlWidth = "w-48" }: { controlWidth?: string }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className={`h-10 ${controlWidth} animate-pulse rounded bg-muted`} />
    </div>
  )
}

// Loading skeleton for settings
function SettingsSkeleton() {
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* User Settings Skeleton */}
      <div>
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 divide-y divide-border">
          {/* Profile Picture Row */}
          <div className="flex items-center justify-between py-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          </div>
          <SkeletonRow controlWidth="w-64" />
          <SkeletonRow controlWidth="w-32" />
        </div>
      </div>

      {/* API Keys Skeleton */}
      <div>
        <div className="flex items-center space-x-2">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-5 w-12 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-6 divide-y divide-border">
          <SkeletonRow controlWidth="w-[22rem]" />
          <SkeletonRow controlWidth="w-[22rem]" />
          <SkeletonRow controlWidth="w-[22rem]" />
        </div>
      </div>
    </div>
  )
}

// Error state
function SettingsError() {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-8 text-center">
      <h2 className="text-2xl font-bold tracking-tight">Error</h2>
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive sm:p-6">
        <p className="font-medium">Unable to load settings</p>
        <p className="text-sm">
          Something went wrong. Please try refreshing the page.
        </p>
      </div>
    </div>
  )
}
