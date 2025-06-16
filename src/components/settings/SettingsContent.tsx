"use client"

import { usePreloadedQuery } from "convex/react"
import type { Preloaded } from "convex/react"
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
  let user: any = null
  let userSettings: any = null

  try {
    user = usePreloadedQuery(preloadedUser)
    userSettings = usePreloadedQuery(preloadedUserSettings)
  } catch (error) {
    console.error("Error loading preloaded data:", error)
    return null
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-12">
      <ProfileSection user={user} userSettings={userSettings} />
      <ApiKeysSection userSettings={userSettings} />
    </div>
  )
}
