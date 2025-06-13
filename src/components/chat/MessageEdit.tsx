"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Check, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface MessageEditProps {
  initialValue: string
  onSave: (newContent: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function MessageEdit({
  initialValue,
  onSave,
  onCancel,
  isLoading = false,
}: MessageEditProps) {
  const [value, setValue] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [value])

  // Focus and select text on mount
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(0, textarea.value.length)
    }
  }, [])

  const handleSave = useCallback(() => {
    const trimmedValue = value.trim()
    if (trimmedValue && trimmedValue !== initialValue) {
      onSave(trimmedValue)
    } else {
      onCancel()
    }
  }, [value, initialValue, onSave, onCancel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      e.preventDefault()
      onCancel()
    }
  }, [handleSave, onCancel])

  return (
    <div className="space-y-2">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className="min-h-[60px] resize-none"
        placeholder="Edit your message..."
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isLoading || !value.trim() || value.trim() === initialValue}
        >
          <Check className="h-3 w-3 mr-1" />
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
        <span className="text-xs text-muted-foreground">
          Press {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter to save
        </span>
      </div>
    </div>
  )
}