import { ApiKeysSectionWithPreload } from "@/components/settings/ApiKeysSectionWithPreload"
import { getAuthToken } from "@/lib/auth"
import { preloadQuery } from "convex/nextjs"
import type { Metadata } from "next"
import { Suspense } from "react"
import { api } from "../../../../../convex/_generated/api"

export const metadata: Metadata = {
  title: "API Keys - Settings",
  description: "Manage your AI provider API keys for personalized access.",
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ApiKeysPage() {
  return (
    <Suspense fallback={<ApiKeysSkeleton />}>
      <ApiKeysPageWithData />
    </Suspense>
  )
}

async function ApiKeysPageWithData() {
  try {
    // Get authentication token for server-side requests
    const token = await getAuthToken()

    // Middleware ensures authentication, so token should exist
    if (!token) {
      throw new Error("Authentication required")
    }

    // Preload user settings data for PPR - this will be cached and streamed instantly
    const preloadedUserSettings = await preloadQuery(
      api.userSettings.getUserSettings,
      {},
      { token },
    )

    // Pass preloaded data to client component
    return (
      <ApiKeysSectionWithPreload
        preloadedUserSettings={preloadedUserSettings}
      />
    )
  } catch (error) {
    console.error("Failed to load user settings:", error)
    return <ApiKeysError />
  }
}

// Loading skeleton for API keys
function ApiKeysSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
      </div>

      <div className="space-y-4">
        {/* OpenAI Card Skeleton */}
        <div className="border rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Anthropic Card Skeleton */}
        <div className="border rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Error state
function ApiKeysError() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">API Keys</h3>
        <p className="text-sm text-muted-foreground">
          Unable to load API key settings.
        </p>
      </div>
      <div className="border rounded-lg p-6 text-center text-muted-foreground">
        <p>Something went wrong. Please try refreshing the page.</p>
      </div>
    </div>
  )
}
