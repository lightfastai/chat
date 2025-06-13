"use client"

import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard"
import { cn } from "@/lib/utils"
import { useMutation, useQuery } from "convex/react"
import {
  CheckIcon,
  ClipboardIcon,
  GitBranch,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import React from "react"
import { api } from "../../../convex/_generated/api"
import type { Doc } from "../../../convex/_generated/dataModel"
import { FeedbackModal } from "./FeedbackModal"

interface MessageActionsProps {
  message: Doc<"messages">
  className?: string
  onBranch?: (messageId: string) => void
}

export function MessageActions({
  message,
  className,
  onBranch,
}: MessageActionsProps) {
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false)
  const { copy, isCopied } = useCopyToClipboard({ timeout: 2000 })

  const feedback = useQuery(api.feedback.getUserFeedbackForMessage, {
    messageId: message._id,
  })

  const submitFeedback = useMutation(api.feedback.submitFeedback)
  const removeFeedback = useMutation(api.feedback.removeFeedback)

  const handleFeedback = async (rating: "positive" | "negative") => {
    if (rating === "negative") {
      setShowFeedbackModal(true)
      return
    }

    if (feedback?.rating === rating) {
      await removeFeedback({ messageId: message._id })
    } else {
      await submitFeedback({
        messageId: message._id,
        rating: "positive",
        comment: feedback?.comment,
        reasons: feedback?.reasons,
      })
    }
  }

  const handleCopy = () => {
    if (message.body) {
      copy(message.body)
    }
  }

  const handleBranch = () => {
    onBranch?.(message._id)
  }

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 transition-colors",
            feedback?.rating === "positive" &&
              "text-green-600 hover:text-green-700",
          )}
          onClick={() => handleFeedback("positive")}
          aria-label="Like message"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 transition-colors",
            feedback?.rating === "negative" &&
              "text-red-600 hover:text-red-700",
          )}
          onClick={() => handleFeedback("negative")}
          aria-label="Dislike message"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
        {onBranch && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleBranch}
            aria-label="Branch conversation from here"
          >
            <GitBranch className="h-4 w-4" />
          </Button>
        )}
        {message.body && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            aria-label={isCopied ? "Copied" : "Copy message"}
          >
            {isCopied ? (
              <CheckIcon className="h-4 w-4 text-green-600" />
            ) : (
              <ClipboardIcon className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {showFeedbackModal && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          messageId={message._id}
          existingFeedback={feedback}
        />
      )}
    </>
  )
}
