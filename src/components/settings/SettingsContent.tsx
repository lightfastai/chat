"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePreloadedQuery } from "convex/react"
import type { Preloaded } from "convex/react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import type { api } from "../../../convex/_generated/api"
import { ApiKeysSection } from "./ApiKeysSection"
import { ProfileSection } from "./ProfileSection"

interface SettingsContentProps {
  preloadedUser: Preloaded<typeof api.users.current>
  preloadedUserSettings: Preloaded<typeof api.userSettings.getUserSettings>
}

export function SettingsContent({
  preloadedUser,
  preloadedUserSettings,
}: SettingsContentProps) {
  const pathname = usePathname()

  // Use try-catch to handle any preload query errors gracefully
  let user: {
    _id: string
    _creationTime: number
    name?: string
    email?: string
    image?: string
    emailVerificationTime?: number
    phoneVerificationTime?: number
    isAnonymous?: boolean
  } | null = null
  let userSettings: {
    hasOpenAIKey: boolean
    hasAnthropicKey: boolean
    hasOpenRouterKey: boolean
  } | null = null

  try {
    user = usePreloadedQuery(preloadedUser)
    userSettings = usePreloadedQuery(preloadedUserSettings)
  } catch (error) {
    console.error("Error loading preloaded data:", error)
    // Return null to trigger Suspense boundary instead of error state
    return null
  }

  // Determine initial tab based on URL
  const initialTab =
    pathname === "/chat/settings/api-keys" ? "api-keys" : "profile"
  const [activeTab, setActiveTab] = useState(initialTab)

  // Update URL without triggering navigation
  useEffect(() => {
    const newPath =
      activeTab === "api-keys" ? "/chat/settings/api-keys" : "/chat/settings"
    if (pathname !== newPath) {
      // Use replace to avoid adding to history for tab switches
      window.history.replaceState({}, "", newPath)
    }
  }, [activeTab, pathname])

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const newPath = window.location.pathname
      const newTab =
        newPath === "/chat/settings/api-keys" ? "api-keys" : "profile"
      setActiveTab(newTab)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // During navigation, user might be null temporarily - let Suspense handle it
  if (!user) {
    return null // This will trigger the Suspense boundary fallback
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileSection user={user} userSettings={userSettings} />
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <ApiKeysSection userSettings={userSettings} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
