import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SettingsNavigation } from "../../../components/settings/SettingsNavigation"

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  // Server-side authentication check
  const [authenticated, user] = await Promise.all([
    isAuthenticated(),
    getCurrentUser(),
  ])

  if (!authenticated || !user) {
    redirect("/signin")
  }

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Navigation with content */}
        <SettingsNavigation>{children}</SettingsNavigation>
      </div>
    </div>
  )
}
