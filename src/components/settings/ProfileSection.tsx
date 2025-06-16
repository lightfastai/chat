import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { User } from "lucide-react"
import { SettingsHeader } from "./SettingsHeader"
import { SettingsRow } from "./SettingsRow"

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
  userSettings:
    | {
        hasOpenAIKey: boolean
        hasAnthropicKey: boolean
        hasOpenRouterKey: boolean
      }
    | null
    | undefined // Not used in ProfileSection but passed for consistency
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div>
      <SettingsHeader title="User Settings" />

      <div className="mt-6 divide-y divide-border">
        <SettingsRow
          title="Profile Picture"
          description="This is your profile picture."
        >
          <Avatar className="h-10 w-10">
            {user.image && (
              <AvatarImage
                src={user.image}
                alt={user.name || "User"}
                className="object-cover"
              />
            )}
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </SettingsRow>

        <SettingsRow title="Email" description="Your email address.">
          <Input
            value={user.email || ""}
            placeholder="god@lightfast.ai"
            className="w-64"
            disabled
          />
        </SettingsRow>

        <SettingsRow
          title="Member Since"
          description="The date you joined the platform."
        >
          <div className="text-sm text-muted-foreground">
            {formatDate(user._creationTime)}
          </div>
        </SettingsRow>
      </div>
    </div>
  )
}
