import { ApiKeysManager } from "@/components/settings/api-keys-manager"
import { SettingsHeader } from "@/components/settings/settings-header"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "API Keys - Settings",
  description: "Manage your AI provider API keys for personalized access.",
  robots: {
    index: false,
    follow: false,
  },
}

// Enable static generation where possible for better performance
export const dynamic = "force-dynamic" // Required for auth checks
export const revalidate = 0 // No caching for authenticated pages

export default async function ApiKeysPage() {
  // Server-side authentication check with proper error handling
  const [authenticated, user] = await Promise.all([
    isAuthenticated(),
    getCurrentUser(),
  ])

  if (!authenticated || !user) {
    redirect("/signin")
  }

  return (
    <div className="space-y-8">
      <SettingsHeader
        title="API Keys"
        description="Configure your AI provider API keys to use your own accounts. Your keys are encrypted and stored securely."
      />

      <ApiKeysManager />
    </div>
  )
}
