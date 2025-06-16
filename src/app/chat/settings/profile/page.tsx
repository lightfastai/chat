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

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ProfilePage() {
  // Get user data - middleware ensures authentication
  const user = await getCurrentUser()

  // User will always exist here due to middleware protection
  return <ProfileSection user={user!} />
}
