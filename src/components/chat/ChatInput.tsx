"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFileDrop } from "@/hooks/useFileDrop"
import { DEFAULT_MODEL_ID, getAllModels, getModelById } from "@/lib/ai"
import { useMutation } from "convex/react"
import {
  ChevronDown,
  FileIcon,
  FileText,
  Globe,
  Image,
  Loader2,
  Paperclip,
  Send,
  X,
} from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

interface ChatInputProps {
  onSendMessage: (
    message: string,
    modelId: string,
    attachments?: Id<"files">[],
    webSearchEnabled?: boolean,
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
  const [isUploading, setIsUploading] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const createFile = useMutation(api.files.createFile)

  // Determine if submission should be disabled (but allow typing)
  const isSubmitDisabled = useMemo(
    () => disabled || isLoading || isSending,
    [disabled, isLoading, isSending],
  )

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

  // Provider display names
  const providerNames: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    openrouter: "OpenRouter",
  }

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
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(1)
            toast.error(
              `${file.name} is ${sizeInMB}MB. Maximum file size is 10MB`,
            )
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
            throw new Error(`Failed to upload ${file.name}. Please try again.`)
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

        if (newAttachments.length === 0 && files.length > 0) {
          toast.error(
            "No files were uploaded. Please check file types and sizes.",
          )
        } else {
          setAttachments([...attachments, ...newAttachments])
          if (newAttachments.length === 1) {
            toast.success(`${newAttachments[0].name} uploaded successfully`)
          } else if (newAttachments.length > 1) {
            toast.success(
              `${newAttachments.length} files uploaded successfully`,
            )
          }
        }
      } catch (error) {
        console.error("Error uploading files:", error)

        if (error instanceof Error) {
          // Show specific error messages from backend
          if (error.message.includes("sign in")) {
            toast.error("Please sign in to upload files")
          } else if (error.message.includes("file type")) {
            toast.error(error.message)
          } else if (error.message.includes("too large")) {
            toast.error(error.message)
          } else {
            toast.error(`Upload failed: ${error.message}`)
          }
        } else {
          toast.error("Failed to upload files. Please try again.")
        }
      } finally {
        setIsUploading(false)
      }
    },
    [attachments, generateUploadUrl, createFile],
  )

  // Use the file drop hook
  const { isDragging, dragHandlers } = useFileDrop({
    onDrop: handleFileUpload,
    disabled: isSubmitDisabled || isUploading,
  })

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
    if (!message.trim()) return

    // Show visual indicator if submit is disabled
    if (isSubmitDisabled) {
      toast.info("Please wait for the current response to complete")
      return
    }

    setIsSending(true)

    try {
      const attachmentIds = attachments.map((att) => att.id)
      await onSendMessage(
        message,
        selectedModelId,
        attachmentIds.length > 0 ? attachmentIds : undefined,
        webSearchEnabled,
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
    isSubmitDisabled,
    onSendMessage,
    selectedModelId,
    attachments,
    webSearchEnabled,
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

  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleModelChange = useCallback((value: string) => {
    setSelectedModelId(value)
    setDropdownOpen(false)
  }, [])

  const handleWebSearchToggle = useCallback(() => {
    setWebSearchEnabled((prev) => !prev)
  }, [])

  // Memoize computed values
  const canSend = useMemo(
    () => message.trim() && !isSubmitDisabled,
    [message, isSubmitDisabled],
  )

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={`p-2 sm:p-4 flex-shrink-0 ${className}`} {...dragHandlers}>
      <div className="max-w-3xl mx-auto relative">
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md border-2 border-dashed border-primary animate-in fade-in-0 duration-200">
            <div className="text-center">
              <Paperclip className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Drop files here</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, images, and documents supported
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            {/* Main input container */}
            <div
              className={`w-full border flex flex-col transition-all bg-transparent dark:bg-input/10 ${
                attachments.length > 0 ? "rounded-t-md" : "rounded-md"
              } ${isLoading ? "opacity-75" : ""}`}
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
                  disabled={disabled}
                  style={{
                    lineHeight: "24px",
                    minHeight: "48px",
                  }}
                />
              </div>

              {/* Controls area - always at bottom */}
              <div className="flex items-center justify-between p-2 bg-transparent dark:bg-input/10 transition-[color,box-shadow]">
                <div className="flex items-center gap-2">
                  <DropdownMenu
                    modal={false}
                    open={dropdownOpen}
                    onOpenChange={setDropdownOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs justify-between font-normal"
                        disabled={disabled}
                      >
                        <span className="truncate">
                          {selectedModel?.displayName}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      {Object.entries(modelsByProvider).map(
                        ([provider, models]) => (
                          <DropdownMenuSub key={provider}>
                            <DropdownMenuSubTrigger>
                              <span>{providerNames[provider] || provider}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent className="w-64">
                                {models.map((model) => (
                                  <DropdownMenuItem
                                    key={model.id}
                                    onClick={() => handleModelChange(model.id)}
                                    className="flex flex-col items-start py-2"
                                  >
                                    <span className="font-medium">
                                      {model.displayName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {model.description}
                                    </span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

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
                        disabled={disabled || isUploading}
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

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleWebSearchToggle}
                        variant={webSearchEnabled ? "default" : "ghost"}
                        size="sm"
                        className="h-6 w-6 p-0"
                        disabled={disabled}
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

            {/* Attachments container - appears below input */}
            {attachments.length > 0 && (
              <div className="w-full border-l border-r border-b rounded-b-md bg-secondary/20 p-3 transition-all animate-in slide-in-from-top-1 duration-200">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment) => {
                    const isImage = attachment.type.startsWith("image/")
                    const isPdf = attachment.type === "application/pdf"

                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 px-3 py-2 bg-background rounded-md border text-sm group hover:border-foreground/20 transition-colors"
                      >
                        {isImage ? (
                          <Image className="w-4 h-4 text-muted-foreground" />
                        ) : isPdf ? (
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <FileIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate max-w-[150px] font-medium">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1 hover:bg-destructive/10 rounded"
                          disabled={disabled || isUploading}
                          aria-label={`Remove ${attachment.name}`}
                        >
                          <X className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Memoize the entire component to prevent unnecessary re-renders
export const ChatInput = memo(ChatInputComponent)
