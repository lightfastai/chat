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
      {/* Main input container - matches ChatInput structure */}
      <div className="w-full border flex flex-col transition-all bg-transparent dark:bg-input/10 rounded-md">
        {/* Textarea area - grows with content up to max height */}
        <ScrollArea className="flex-1 max-h-[180px]">
          <div className="p-4">
            <Textarea
              ref={textareaRef}
              placeholder="Ask anything..."
              className="w-full resize-none border-0 focus-visible:ring-0 whitespace-pre-wrap break-words bg-transparent p-0 text-lg"
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              style={{
                lineHeight: "28px",
                minHeight: "120px",
              }}
            />
          </div>
        </ScrollArea>

        {/* Controls area - always at bottom */}
        <div className="flex items-center justify-end p-3 bg-transparent dark:bg-input/10 transition-[color,box-shadow]">
          <Button
            size="icon"
            onClick={handleSendClick}
            disabled={!message.trim()}
            className="h-8 w-8 p-0"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <SignInDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
      />
    </>
  )
}
