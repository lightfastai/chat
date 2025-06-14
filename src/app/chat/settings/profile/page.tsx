import { ProfileSection } from "@/components/settings/ProfileSection"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
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

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ProfilePage() {
  // Server-side authentication check
  const [authenticated, user] = await Promise.all([
    isAuthenticated(),
    getCurrentUser(),
  ])

  if (!authenticated || !user) {
    redirect("/signin")
  }

  return <ProfileSection user={user} />
}
