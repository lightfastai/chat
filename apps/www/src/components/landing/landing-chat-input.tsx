"use client"

import { SignInDialog } from "@/components/auth/sign-in-dialog"
import { PromptSuggestions } from "@/components/chat/prompt-suggestions"
import { Button } from "@lightfast/ui/components/ui/button"
import { Textarea } from "@lightfast/ui/components/ui/textarea"
import { ArrowUp } from "lucide-react"
import { useCallback, useRef, useState } from "react"

export function LandingChatInput() {
  const [showSignInDialog, setShowSignInDialog] = useState(false)
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleSelectPrompt = useCallback((prompt: string) => {
    setMessage(prompt)
    // Focus the textarea after selecting a prompt
    textareaRef.current?.focus()
  }, [])

  return (
    <>
      <div className="relative">
        {/* Main input container - matching chat input styling */}
        <div className="w-full border border-muted/30 rounded-xl overflow-hidden flex flex-col transition-all bg-transparent dark:bg-input/10">
          {/* Textarea area */}
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Ask anything..."
              className="w-full resize-none border-0 focus-visible:ring-0 whitespace-pre-wrap break-words p-3 bg-transparent dark:bg-input/10 focus:bg-transparent dark:focus:bg-input/10 hover:bg-transparent dark:hover:bg-input/10 disabled:bg-transparent dark:disabled:bg-input/10 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="true"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
              style={{
                lineHeight: "24px",
                minHeight: "72px",
              }}
            />
          </div>

          {/* Controls area - matching chat input */}
          <div className="flex items-center justify-end p-2 bg-transparent dark:bg-input/10 transition-[color,box-shadow]">
            <Button
              variant="default"
              size="icon"
              onClick={handleSendClick}
              className="h-8 w-8 p-0 rounded-full"
              disabled={!message.trim()}
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Prompt suggestions positioned absolutely below chat input */}
        {!message && (
          <div className="absolute top-full left-0 right-0 z-10 mt-4 animate-in fade-in-0 duration-300">
            <PromptSuggestions onSelectPrompt={handleSelectPrompt} />
          </div>
        )}
      </div>

      <SignInDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
      />
    </>
  )
}
