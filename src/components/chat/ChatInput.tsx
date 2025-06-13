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
import { useMutation } from "convex/react"
import { FileText, Image, Loader2, Paperclip, Send, X } from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

interface ChatInputProps {
  onSendMessage: (
    message: string,
    modelId: string,
    attachments?: Id<"files">[],
  ) => Promise<void> | void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  className?: string
}

interface FileAttachment {
  id: Id<"files">
  name: string
  size: number
  type: string
  url?: string
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
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const createFile = useMutation(api.files.createFile)

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

  // File upload handler
  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return

      setIsUploading(true)
      const newAttachments: FileAttachment[] = []

      try {
        for (const file of Array.from(files)) {
          // Validate file size (10MB max)
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name} exceeds the 10MB size limit`)
            continue
          }

          // Generate upload URL
          const uploadUrl = await generateUploadUrl()

          // Upload the file
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          })

          if (!result.ok) {
            throw new Error(`Failed to upload ${file.name}`)
          }

          const { storageId } = await result.json()

          // Create file record in database
          const fileId = await createFile({
            storageId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          })

          newAttachments.push({
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
          })
        }

        setAttachments([...attachments, ...newAttachments])
        toast.success(`${newAttachments.length} file(s) uploaded successfully`)
      } catch (error) {
        console.error("Error uploading files:", error)
        toast.error("Failed to upload files. Please try again.")
      } finally {
        setIsUploading(false)
      }
    },
    [attachments, generateUploadUrl, createFile],
  )

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        await handleFileUpload(files)
      }
    },
    [handleFileUpload],
  )

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        await handleFileUpload(files)
      }
    },
    [handleFileUpload],
  )

  const removeAttachment = useCallback((id: Id<"files">) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id))
  }, [])

  // Memoize event handlers
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isSending || disabled) return

    setIsSending(true)

    try {
      const attachmentIds = attachments.map((att) => att.id)
      await onSendMessage(
        message,
        selectedModelId,
        attachmentIds.length > 0 ? attachmentIds : undefined,
      )
      setMessage("")
      setAttachments([])
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
  }, [
    message,
    isSending,
    disabled,
    onSendMessage,
    selectedModelId,
    attachments,
  ])

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

  // Memoize computed values
  const canSend = useMemo(
    () => message.trim() && !isSending && !disabled && !isLoading,
    [message, isSending, disabled, isLoading],
  )

  return (
    <div
      className={`p-4 flex-shrink-0 ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <div
              className={`w-full rounded-md border flex flex-col transition-all ${isLoading ? "opacity-75 cursor-not-allowed" : ""} ${isDragging ? "border-primary bg-primary/5" : ""}`}
            >
              {/* Attachments display */}
              {attachments.length > 0 && (
                <div className="p-2 border-b">
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-xs"
                      >
                        {attachment.type.startsWith("image/") ? (
                          <Image className="w-3 h-3" />
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        <span className="max-w-[100px] truncate">
                          {attachment.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="ml-1 hover:text-destructive"
                          disabled={isUploading}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

                  {/* File attachment button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                    accept="application/pdf,text/*,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="h-6 w-6 p-0"
                      >
                        {isUploading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Paperclip className="w-3 h-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Attach files</p>
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

        {/* Bottom section for future features */}
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
