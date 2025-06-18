"use client"

import { SignInDialog } from "@/components/auth/SignInDialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { ArrowUp } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

export function LandingChatInput() {
  const [showSignInDialog, setShowSignInDialog] = useState(false)
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea functionality
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to get accurate scrollHeight
    textarea.style.height = "auto"
    // Let textarea grow naturally, ScrollArea will handle overflow
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [message, adjustTextareaHeight])

  const handleSubmit = () => {
    if (message.trim()) {
      setShowSignInDialog(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSendClick = () => {
    handleSubmit()
  }

  const handleMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value)
    },
    [],
  )

  return (
    <>
      <div className="relative border rounded-md">
        <ScrollArea className="max-h-[180px]">
          <div className="p-4 pr-16">
            <Textarea
              ref={textareaRef}
              placeholder="Ask anything..."
              className="min-h-[120px] resize-none border-0 focus-visible:ring-0 text-lg bg-transparent p-0 whitespace-pre-wrap break-words"
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              style={{
                lineHeight: "28px",
              }}
            />
          </div>
        </ScrollArea>
        <Button
          size="icon"
          onClick={handleSendClick}
          className="absolute right-3 bottom-3"
          disabled={!message.trim()}
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      </div>

      <SignInDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
      />
    </>
  )
}
