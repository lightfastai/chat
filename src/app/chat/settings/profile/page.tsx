import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Profile - Settings",
  description: "View and manage your profile information.",
  robots: {
    index: false,
    follow: false,
  },
}

// This page now redirects to the main settings page
// The SettingsContent component will handle tab routing based on URL
export default function ProfilePage() {
  redirect("/chat/settings")
}
