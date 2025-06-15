import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { User } from "lucide-react"

interface ProfileSectionProps {
  user: {
    _id: string
    _creationTime: number
    name?: string
    email?: string
    image?: string
    emailVerificationTime?: number
    phoneVerificationTime?: number
    isAnonymous?: boolean
  }
}

export function ProfileSection({ user }: ProfileSectionProps) {
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
    return badges
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Your profile information from GitHub.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              {user.image && (
                <AvatarImage
                  src={user.image}
                  alt={user.name || "User"}
                  className="object-cover"
                />
              )}
              <AvatarFallback>
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2 flex-1">
              <div>
                <h4 className="text-sm font-medium">
                  {user.name || "Anonymous User"}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {user.email || "No email provided"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getVerificationBadges()}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Member since</p>
              <p className="text-muted-foreground">
                {formatDate(user._creationTime)}
              </p>
            </div>
            <div>
              <p className="font-medium">Authentication</p>
              <p className="text-muted-foreground">GitHub OAuth</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
