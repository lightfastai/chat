"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAllModels, getModelById } from "@/lib/ai/models"
import type { ModelId } from "@/lib/ai/types"
import { useMutation } from "convex/react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

interface BranchDialogProps {
  isOpen: boolean
  onClose: () => void
  messageId: Id<"messages">
  threadId: Id<"threads">
  currentModelId?: string
}

export function BranchDialog({
  isOpen,
  onClose,
  messageId,
  threadId,
  currentModelId,
}: BranchDialogProps) {
  const router = useRouter()
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(
    (currentModelId as ModelId) || "gpt-4o-mini",
  )
  const [isCreating, setIsCreating] = useState(false)

  const branchThread = useMutation(api.threads.branchFromMessage)

  const allModels = getAllModels()
  const selectedModel = getModelById(selectedModelId)

  const handleBranch = async () => {
    try {
      setIsCreating(true)
      const newThreadId = await branchThread({
        originalThreadId: threadId,
        branchFromMessageId: messageId,
        modelId: selectedModelId,
      })

      toast.success("New branch created successfully")
      router.push(`/chat/${newThreadId}`)
      onClose()
    } catch (error) {
      console.error("Failed to create branch:", error)
      toast.error("Failed to create branch. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Branch Conversation</DialogTitle>
          <DialogDescription>
            Create a new conversation branch from this point with a different
            model. All messages up to this point will be copied to the new
            thread.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="model" className="text-sm font-medium">
              Select model for new branch
            </label>
            <Select
              value={selectedModelId}
              onValueChange={(value) => setSelectedModelId(value as ModelId)}
            >
              <SelectTrigger id="model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {allModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{model.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModel && (
              <p className="text-xs text-muted-foreground">
                Input: $
                {(selectedModel.costPer1KTokens.input * 1000).toFixed(2)}/
                Output: $
                {(selectedModel.costPer1KTokens.output * 1000).toFixed(2)} per
                1M tokens
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleBranch} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Branch"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
