"use client"

import { type Preloaded, usePreloadedQuery } from "convex/react"
import type { api } from "../../../convex/_generated/api"
import { ApiKeysSection } from "./ApiKeysSection"

interface ApiKeysSectionWithPreloadProps {
  preloadedUserSettings: Preloaded<typeof api.userSettings.getUserSettings>
}

export function ApiKeysSectionWithPreload({
  preloadedUserSettings,
}: ApiKeysSectionWithPreloadProps) {
  // Consume the preloaded query to prime the Convex cache
  // This ensures that when ApiKeysSection calls useQuery, it gets instant data
  usePreloadedQuery(preloadedUserSettings)

  // ApiKeysSection will use its own useQuery hook, which will now be instant
  // thanks to the preloaded data in the Convex cache
  return <ApiKeysSection />
}
