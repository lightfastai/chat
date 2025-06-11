import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser, isAuthenticated } from "@/lib/auth"
import { Calendar, User } from "lucide-react"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  // Check authentication on the server side
  const authenticated = await isAuthenticated()

  if (!authenticated) {
    redirect("/")
  }

  // Get current user information
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">User Profile</h1>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
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
    </div>
  )
}
