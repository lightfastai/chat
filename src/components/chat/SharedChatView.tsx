"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"
import { useMutation, useQuery } from "convex/react"
import { format } from "date-fns"
import { AlertCircle, Loader2, Share2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface SharedChatViewProps {
  shareId: string
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

export function SharedChatView({ shareId }: SharedChatViewProps) {
  // Create a simple client fingerprint for rate limiting
  const clientInfo = useMemo(() => {
    if (typeof window === "undefined") return undefined

    // Create a basic fingerprint without tracking personal info
    const fingerprint = [
      navigator.userAgent,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join("|")

    return {
      ipHash: hashString(fingerprint), // Client-side hash, not real IP
      userAgent: navigator.userAgent.substring(0, 100), // Limit length
    }
  }, [])

  const logAccess = useMutation(api.share.logShareAccess)
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null)

  const sharedData = useQuery(
    api.share.getSharedThread,
    accessAllowed ? { shareId } : "skip",
  )

  // Log access attempt on component mount
  useEffect(() => {
    if (accessAllowed === null) {
      logAccess({ shareId, clientInfo })
        .then((result) => {
          setAccessAllowed(result.allowed)
        })
        .catch(() => {
          setAccessAllowed(false)
        })
    }
  }, [shareId, clientInfo, logAccess, accessAllowed])

  // Show loading while checking access or loading data
  if (accessAllowed === null || (accessAllowed && sharedData === undefined)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show error if access not allowed or data not found
  if (!accessAllowed || sharedData === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Chat not found</h1>
        <p className="text-muted-foreground">
          This chat may have been deleted or the link has expired.
        </p>
      </div>
    )
  }

  const { thread, messages, owner } = sharedData!

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Share2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">{thread.title}</h1>
            <p className="text-sm text-muted-foreground">
              Shared by {owner?.name || "Anonymous"} on{" "}
              {format(new Date(thread.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <Badge variant="secondary">View Only</Badge>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message._id}
              className={cn(
                "flex gap-3",
                message.messageType === "assistant" && "flex-row-reverse",
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                {message.messageType === "user" ? (
                  <>
                    <AvatarImage src={owner?.image} />
                    <AvatarFallback>
                      {owner?.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </>
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    AI
                  </AvatarFallback>
                )}
              </Avatar>

              <div
                className={cn(
                  "flex-1 space-y-2",
                  message.messageType === "assistant" && "text-right",
                )}
              >
                <div
                  className={cn(
                    "inline-block rounded-lg px-4 py-2",
                    message.messageType === "user"
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {message.messageType === "user" ? (
                    <p className="whitespace-pre-wrap">{message.body}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          pre: ({ children }) => (
                            <pre className="bg-muted rounded-md p-3 overflow-x-auto">
                              {children}
                            </pre>
                          ),
                          code: ({ children, ...props }) => {
                            const isInline =
                              !props.className?.includes("language-")
                            return isInline ? (
                              <code className="bg-muted px-1 py-0.5 rounded text-sm">
                                {children}
                              </code>
                            ) : (
                              <>{children}</>
                            )
                          },
                        }}
                      >
                        {message.body}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Show thinking content if enabled */}
                {thread.shareSettings?.showThinking &&
                  message.thinkingContent && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        View thinking process
                      </summary>
                      <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.thinkingContent}
                        </ReactMarkdown>
                      </div>
                    </details>
                  )}

                <p className="text-xs text-muted-foreground">
                  {format(new Date(message.timestamp), "h:mm a")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <footer className="border-t px-6 py-3">
        <p className="text-sm text-center text-muted-foreground">
          This is a read-only view of a shared conversation
        </p>
      </footer>
    </div>
  )
}
