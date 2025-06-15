import { ApiKeysSection } from "@/components/settings/ApiKeysSection"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "API Keys - Settings",
  description: "Manage your AI provider API keys for personalized access.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ApiKeysPage() {
  return <ApiKeysSection />
}
