import { SettingsCardItem } from "@/components/settings/settings-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { User } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Account - Settings",
  description: "View and manage your account information and preferences.",
  robots: {
    index: false,
    follow: false,
  },
}

// Enable proper SSR for authenticated pages
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AccountPage() {
  // Server-side authentication check with proper error handling
  const [authenticated, user] = await Promise.all([
    isAuthenticated(),
    getCurrentUser(),
  ])

  if (!authenticated || !user) {
    redirect("/signin")
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getVerificationBadges = () => {
    const badges = []
    if (user.emailVerificationTime) {
      badges.push(
        <Badge key="email" variant="secondary" className="text-xs">
          Email Verified
        </Badge>,
      )
    }
    if (user.phoneVerificationTime) {
      badges.push(
        <Badge key="phone" variant="secondary" className="text-xs">
          Phone Verified
        </Badge>,
      )
    }
    if (user.isAnonymous) {
      badges.push(
        <Badge key="anon" variant="outline" className="text-xs">
          Anonymous
        </Badge>,
      )
    }
    if (
      !user.emailVerificationTime &&
      !user.phoneVerificationTime &&
      !user.isAnonymous
    ) {
      badges.push(
        <Badge key="unverified" variant="outline" className="text-xs">
          Unverified
        </Badge>,
      )
    }
    return badges
  }

  return (
    <div className="space-y-0">
      <div className="space-y-1 pb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Account</h2>
        <p className="text-muted-foreground">
          View and manage your account information and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <SettingsCardItem
          title="Profile"
          description="Your basic account information from GitHub"
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              {user.image && (
                <AvatarImage
                  src={user.image}
                  alt={user.name || "User"}
                  className="object-cover"
                />
              )}
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {user.name || "Anonymous User"}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.email || "No email provided"}
              </p>
            </div>
          </div>
        </SettingsCardItem>

        {/* Member Since */}
        <SettingsCardItem
          title="Member Since"
          description="When you first joined the platform"
        >
          <div className="text-sm text-muted-foreground">
            {formatDate(user._creationTime)}
          </div>
        </SettingsCardItem>

        {/* Verification Status */}
        <SettingsCardItem
          title="Verification Status"
          description="Your account verification badges"
        >
          <div className="flex gap-2 flex-wrap">{getVerificationBadges()}</div>
        </SettingsCardItem>

        {/* Authentication */}
        <SettingsCardItem
          title="Authentication"
          description="Your account is secured with GitHub OAuth"
        >
          <div className="text-sm text-muted-foreground">
            <div className="space-y-1">
              <p>• GitHub OAuth authentication</p>
              <p>• Profile data synced with GitHub</p>
              <p>• Enhanced security protection</p>
            </div>
          </div>
        </SettingsCardItem>

        {/* Security */}
        <SettingsCardItem
          title="Data Security"
          description="How we protect your information"
        >
          <div className="text-sm text-muted-foreground">
            <div className="space-y-1">
              <p>• All sensitive data encrypted</p>
              <p>• API keys stored securely</p>
              <p>• No passwords stored locally</p>
            </div>
          </div>
        </SettingsCardItem>
      </div>
    </div>
  )
}
