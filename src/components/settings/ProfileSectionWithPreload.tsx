"use client"

import { type Preloaded, usePreloadedQuery } from "convex/react"
import type { api } from "../../../convex/_generated/api"
import { ProfileSection } from "./ProfileSection"

interface ProfileSectionWithPreloadProps {
  preloadedUser: Preloaded<typeof api.users.current>
}

export function ProfileSectionWithPreload({
  preloadedUser,
}: ProfileSectionWithPreloadProps) {
  // Use the preloaded query - this will be instant and non-blocking
  const user = usePreloadedQuery(preloadedUser)

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Profile</h3>
          <p className="text-sm text-muted-foreground">
            No user data available.
          </p>
        </div>
      </div>
    )
  }

  return <ProfileSection user={user} />
}
