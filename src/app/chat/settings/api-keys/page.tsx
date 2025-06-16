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

// This page now redirects to the main settings page
// The SettingsContent component will handle tab routing based on URL
export default function ApiKeysPage() {
  redirect("/chat/settings")
}
