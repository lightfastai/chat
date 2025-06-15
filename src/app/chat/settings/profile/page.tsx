import { ProfileSection } from "@/components/settings/ProfileSection"
import { getCurrentUser } from "@/lib/auth"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Profile - Settings",
  description: "View and manage your profile information.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ProfilePage() {
  // Get user data - middleware ensures authentication
  const user = await getCurrentUser()

  // Handle null user case gracefully
  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Unable to load profile information.</p>
      </div>
    )
  }

  return <ProfileSection user={user} />
}
