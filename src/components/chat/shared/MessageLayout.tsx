import { cn } from "@/lib/utils"
import type React from "react"

export interface MessageLayoutProps {
  avatar: React.ReactNode
  content: React.ReactNode
  timestamp?: React.ReactNode
  actions?: React.ReactNode
  messageType: "user" | "assistant"
  className?: string
}

export function MessageLayout({
  avatar,
  content,
  timestamp,
  actions,
  messageType,
  className,
}: MessageLayoutProps) {
  const isAssistant = messageType === "assistant"

  return (
    <div
      className={cn(
        "flex gap-3 group/message",
        isAssistant ? "mt-6" : "mt-4",
        className,
      )}
    >
      {avatar}
      <div className="flex-1 relative">
        {content}
        {timestamp && (
          <div className="text-xs text-muted-foreground mt-1">{timestamp}</div>
        )}
        {actions && (
          <div className="opacity-0 transition-opacity group-hover/message:opacity-100">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
