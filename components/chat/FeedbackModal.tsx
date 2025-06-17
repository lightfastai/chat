"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useMutation } from "convex/react"
import React from "react"
import { api } from "../../../convex/_generated/api"
import type { Doc, Id } from "../../../convex/_generated/dataModel"

const feedbackOptions = [
  "Incorrect information",
  "Instructions ignored",
  "Being lazy",
  "Don't like style",
  "Bad recommendation",
  "Other",
] as const

type FeedbackReason = (typeof feedbackOptions)[number]

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  messageId: Id<"messages">
  existingFeedback?: Doc<"feedback"> | null
}

export function FeedbackModal({
  isOpen,
  onClose,
  messageId,
  existingFeedback,
}: FeedbackModalProps) {
  const [comment, setComment] = React.useState("")
  const [selectedReasons, setSelectedReasons] = React.useState<
    FeedbackReason[]
  >([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (isOpen) {
      setComment(existingFeedback?.comment || "")
      setSelectedReasons(
        (existingFeedback?.reasons as FeedbackReason[] | undefined) || [],
      )
    }
  }, [isOpen, existingFeedback])

  const submitFeedback = useMutation(api.feedback.submitFeedback)

  const handleReasonChange = (reason: FeedbackReason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await submitFeedback({
        messageId,
        rating: "negative",
        comment: comment.trim() || undefined,
        reasons: selectedReasons,
      })
      onClose()
    } catch (error) {
      console.error("Error submitting feedback:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Give feedback</DialogTitle>
          <DialogDescription>
            Provide additional feedback on this message. Select all that apply.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {feedbackOptions.map((reason) => (
            <div key={reason} className="flex items-center space-x-2">
              <Checkbox
                id={reason}
                checked={selectedReasons.includes(reason)}
                onCheckedChange={() => handleReasonChange(reason)}
              />
              <Label
                htmlFor={reason}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {reason}
              </Label>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="comment">How can we improve? (optional)</Label>
          <Textarea
            id="comment"
            placeholder="Your feedback..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (selectedReasons.length === 0 && comment.trim() === "")
            }
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
