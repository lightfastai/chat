import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { Calendar, User } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Profile - Lightfast",
  description: "Manage your Lightfast profile and account settings.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ProfilePage() {
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
        <h1 className="text-3xl font-bold">User Profile</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your account information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              {user.image && (
                <AvatarImage
                  src={user.image}
                  alt={user.name || "User"}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="text-lg">
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">
                {user.name || "Anonymous User"}
              </CardTitle>
              <p className="text-muted-foreground">
                {user.email || "No email provided"}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Member since {new Date(user._creationTime).toLocaleDateString()}
            </span>
          </div>

          <div className="flex gap-2">
            {user.emailVerificationTime && (
              <Badge variant="secondary">Email Verified</Badge>
            )}
            {user.phoneVerificationTime && (
              <Badge variant="secondary">Phone Verified</Badge>
            )}
            {user.isAnonymous && <Badge variant="outline">Anonymous</Badge>}
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              This page demonstrates server-side authentication with Convex
              Auth. The user data is fetched on the server before the page
              renders.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
