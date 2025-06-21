"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getAuthModes,
  getDefaultAuthMode,
  getFeatureFlagConfig,
} from "@/lib/feature-flags"

/**
 * Debug component to show current feature flag configuration
 * Only shows in development mode
 */
export function FeatureFlagDebug() {
  const config = getFeatureFlagConfig()
  const authModes = getAuthModes()
  const defaultAuthMode = getDefaultAuthMode()

  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 max-h-96 overflow-auto z-50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🚩 Feature Flags</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>
          <p className="font-medium">Authentication:</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {authModes.map((mode) => (
              <Badge
                key={mode}
                variant={mode === defaultAuthMode ? "default" : "secondary"}
                className="text-xs"
              >
                {mode === defaultAuthMode ? `${mode} (default)` : mode}
              </Badge>
            ))}
          </div>
        </div>

        {config.sentry?.enabled && (
          <div>
            <p className="font-medium">Sentry:</p>
            <Badge variant="default" className="text-xs">
              Enabled
            </Badge>
          </div>
        )}

        {config.polar?.enabled && (
          <div>
            <p className="font-medium">Polar:</p>
            <Badge variant="default" className="text-xs">
              Enabled
            </Badge>
          </div>
        )}

        {config.arcjet?.enabled && (
          <div>
            <p className="font-medium">Arcjet:</p>
            <Badge variant="default" className="text-xs">
              Enabled
            </Badge>
          </div>
        )}

        <div className="pt-1 border-t border-border">
          <p className="text-muted-foreground">
            Dev only - not shown in production
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
