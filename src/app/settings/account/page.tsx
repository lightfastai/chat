import { SettingsHeader } from "@/components/settings/settings-header"
import { SettingsSection } from "@/components/settings/settings-section"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { Calendar, Mail, Shield, User } from "lucide-react"
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

  return (
    <div className="space-y-8">
      <SettingsHeader
        title="Account"
        description="Manage your profile information and account preferences."
      />

      {/* Profile Information */}
      <SettingsSection
        title="Profile"
        description="Your basic account information and authentication details."
      >
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {user.image && (
                  <AvatarImage
                    src={user.image}
                    alt={user.name || "User"}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-lg">
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle className="text-xl">
                  {user.name || "Anonymous User"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {user.email || "No email provided"}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Member since</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(user._creationTime).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {user.email && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Verification Status</p>
                  <div className="flex gap-2 mt-1">
                    {user.emailVerificationTime && (
                      <Badge variant="secondary" className="text-xs">
                        Email Verified
                      </Badge>
                    )}
                    {user.phoneVerificationTime && (
                      <Badge variant="secondary" className="text-xs">
                        Phone Verified
                      </Badge>
                    )}
                    {user.isAnonymous && (
                      <Badge variant="outline" className="text-xs">
                        Anonymous
                      </Badge>
                    )}
                    {!user.emailVerificationTime &&
                      !user.phoneVerificationTime &&
                      !user.isAnonymous && (
                        <Badge variant="outline" className="text-xs">
                          Unverified
                        </Badge>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </SettingsSection>

      {/* Account Security */}
      <SettingsSection
        title="Security"
        description="Your account is secured with GitHub OAuth authentication."
      >
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="mt-1">•</div>
                <div>
                  Authentication is handled through GitHub OAuth for enhanced
                  security
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1">•</div>
                <div>
                  Your account data is synchronized with your GitHub profile
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1">•</div>
                <div>
                  All API keys and sensitive data are encrypted in our database
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </SettingsSection>
    </div>
  )
}
