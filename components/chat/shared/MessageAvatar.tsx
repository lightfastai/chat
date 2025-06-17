import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"
import type React from "react"

// Lightfast logo component
function LightfastLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="104"
      height="70"
      viewBox="0 0 104 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Lightfast"
      {...props}
    >
      <title>Lightfast</title>
      <path
        d="M15.3354 57.3195H47.1597V69.7863H0.543457V0.632019H15.3354V57.3195Z"
        fill="currentColor"
      />
      <path
        d="M79.6831 69.7863H65.2798L89.0532 0.658386H103.457L79.6831 69.7863Z"
        fill="currentColor"
      />
    </svg>
  )
}

export interface MessageAvatarProps {
  messageType: "user" | "assistant"
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
          <LightfastLogo className="w-4 h-4" />
        ) : userName ? (
          userName[0]?.toUpperCase()
        ) : (
          <User className="w-4 h-4" />
        )}
      </AvatarFallback>
    </Avatar>
  )
}
