import { ApiKeysManager } from "@/components/settings/api-keys-manager"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "API Keys - Lightfast",
  description: "Manage your AI provider API keys for personalized access.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ApiKeysPage() {
  // Check authentication and get current user information concurrently
  const [authenticated, user] = await Promise.all([
    isAuthenticated(),
    getCurrentUser(),
  ])

  if (!authenticated || !user) {
    redirect("/signin")
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground mt-2">
          Bring your own API keys to use your preferred AI providers. Your keys
          are encrypted and stored securely.
        </p>
      </div>

      <ApiKeysManager />
    </div>
  )
}
