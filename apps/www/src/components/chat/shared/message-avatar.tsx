import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lightfast/ui/components/ui/avatar"
import { Icons } from "@lightfast/ui/components/ui/icons"
import { User } from "lucide-react"

export interface MessageAvatarProps {
  messageType: "user" | "assistant" | "system"
  userImage?: string
  userName?: string
}

export function MessageAvatar({
  messageType,
  userImage,
  userName,
}: MessageAvatarProps) {
  const isAssistant = messageType === "assistant"

  return (
    <Avatar className="w-8 h-8 shrink-0 rounded-md">
      {!isAssistant && userImage && (
        <AvatarImage
          src={userImage}
          alt={userName || "User"}
          className="object-cover"
        />
      )}
      <AvatarFallback
        className={`rounded-md ${
          isAssistant ? "bg-background text-primary" : "bg-secondary"
        }`}
      >
        {isAssistant ? (
          <Icons.logoShort className="w-4" />
        ) : userName ? (
          userName[0]?.toUpperCase()
        ) : (
          <User className="w-4 h-4" />
        )}
      </AvatarFallback>
    </Avatar>
  )
}
