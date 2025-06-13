"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DEFAULT_MODEL_ID, getAllModels, getModelById } from "@/lib/ai"
import { Globe, Loader2, Send } from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
interface ChatInputProps {
  onSendMessage: (
    message: string,
    modelId: string,
    webSearchEnabled?: boolean,
  ) => Promise<void> | void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  className?: string
}

const ChatInputComponent = ({
  onSendMessage,
  isLoading = false,
  placeholder = "Message AI assistant...",
  disabled = false,
  maxLength = 4000,
  className = "",
}: ChatInputProps) => {
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [selectedModelId, setSelectedModelId] =
    useState<string>(DEFAULT_MODEL_ID)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Memoize expensive computations
  const allModels = useMemo(() => getAllModels(), [])
  const selectedModel = useMemo(
    () => getModelById(selectedModelId),
    [selectedModelId],
  )

  // Memoize models grouping
  const modelsByProvider = useMemo(() => {
    return allModels.reduce(
      (acc, model) => {
        if (!acc[model.provider]) {
          acc[model.provider] = []
        }
        acc[model.provider].push(model)
        return acc
      },
      {} as Record<string, typeof allModels>,
    )
  }, [allModels])

  // Memoize textarea height adjustment
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to get accurate scrollHeight
    textarea.style.height = "auto"
    // Let textarea grow naturally, container will handle overflow
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [message, adjustTextareaHeight])

  // Memoize event handlers
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isSending || disabled) return

    setIsSending(true)

    try {
      await onSendMessage(message, selectedModelId, webSearchEnabled)
      setMessage("")
    } catch (error) {
      console.error("Error sending message:", error)

      // Handle specific error types gracefully with toast notifications
      if (error instanceof Error) {
        if (error.message.includes("Please wait for the current")) {
          toast.error(
            "AI is currently responding. Please wait for the response to complete before sending another message.",
          )
        } else if (error.message.includes("Thread not found")) {
          toast.error("This conversation is no longer available.")
        } else if (error.message.includes("User must be authenticated")) {
          toast.error("Please sign in to continue chatting.")
        } else {
          toast.error("Failed to send message. Please try again.")
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.")
      }
    } finally {
      setIsSending(false)
    }
  }, [message, isSending, disabled, onSendMessage, selectedModelId])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage],
  )

  const handleMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value)
    },
    [],
  )

  const handleModelChange = useCallback((value: string) => {
    setSelectedModelId(value)
  }, [])

  const handleWebSearchToggle = useCallback(() => {
    setWebSearchEnabled((prev) => !prev)
  }, [])

  // Memoize computed values
  const canSend = useMemo(
    () => message.trim() && !isSending && !disabled && !isLoading,
    [message, isSending, disabled, isLoading],
  )

  return (
    <div className={`p-4 flex-shrink-0 ${className}`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <div
              className={`w-full rounded-md border flex flex-col ${isLoading ? "opacity-75 cursor-not-allowed" : ""}`}
            >
              {/* Textarea area - grows with content up to max height */}
              <div
                className="flex-1"
                style={{ maxHeight: "180px", overflowY: "auto" }}
              >
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleMessageChange}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder}
                  className="w-full resize-none border-0 focus-visible:ring-0 whitespace-pre-wrap break-words p-3"
                  maxLength={maxLength}
                  disabled={disabled || isSending}
                  style={{
                    lineHeight: "24px",
                    minHeight: "48px",
                  }}
                />
              </div>

              {/* Controls area - always at bottom */}
              <div className="flex items-center justify-between p-2 bg-input/10">
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedModelId}
                    onValueChange={handleModelChange}
                  >
                    <SelectTrigger className="h-6 w-[140px] text-xs border-0">
                      <SelectValue>{selectedModel?.displayName}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(modelsByProvider).map(
                        ([provider, models]) => (
                          <SelectGroup key={provider}>
                            <SelectLabel className="text-xs font-medium capitalize">
                              {provider}
                            </SelectLabel>
                            {models.map((model) => (
                              <SelectItem
                                key={model.id}
                                value={model.id}
                                className="text-xs"
                              >
                                <div className="flex flex-col">
                                  <span>{model.displayName}</span>
                                  {model.features.thinking && (
                                    <span className="text-[10px] text-muted-foreground">
                                      Extended reasoning mode
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ),
                      )}
                    </SelectContent>
                  </Select>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleWebSearchToggle}
                        variant={webSearchEnabled ? "default" : "ghost"}
                        size="sm"
                        className="h-6 w-6 p-0"
                        disabled={disabled || isSending}
                      >
                        <Globe className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {webSearchEnabled
                          ? "Web search enabled - AI can search the web for current information"
                          : "Enable web search for current information"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!canSend}
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send message (Enter)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section for status */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>AI is responding...</span>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {message.length}/{maxLength}
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize the entire component to prevent unnecessary re-renders
export const ChatInput = memo(ChatInputComponent)
