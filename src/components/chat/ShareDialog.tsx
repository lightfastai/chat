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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useMutation, useQuery } from "convex/react"
import { Check, Copy, Globe } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface ShareDialogProps {
  threadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({
  threadId,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState({
    showThinking: false,
  })

  const shareInfo = useQuery(api.share.getThreadShareInfo, {
    threadId: threadId as Id<"threads">,
  })

  const shareThread = useMutation(api.share.shareThread)
  const unshareThread = useMutation(api.share.unshareThread)
  const updateShareSettings = useMutation(api.share.updateShareSettings)

  useEffect(() => {
    if (shareInfo?.shareSettings) {
      setSettings({
        showThinking: shareInfo.shareSettings.showThinking || false,
      })
    }
  }, [shareInfo])

  const shareUrl = shareInfo?.shareId
    ? `${window.location.origin}/share/${shareInfo.shareId}`
    : ""

  const handleShare = async () => {
    try {
      await shareThread({
        threadId: threadId as Id<"threads">,
        settings,
      })

      toast.success("Chat shared", {
        description: "Anyone with the link can now view this chat.",
      })
    } catch (error) {
      toast.error("Failed to share", {
        description: "There was an error sharing your chat. Please try again.",
      })
    }
  }

  const handleUnshare = async () => {
    try {
      await unshareThread({
        threadId: threadId as Id<"threads">,
      })

      toast.success("Chat unshared", {
        description: "The share link has been disabled.",
      })
    } catch (error) {
      toast.error("Failed to unshare", {
        description:
          "There was an error disabling the share link. Please try again.",
      })
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      toast.success("Link copied", {
        description: "The share link has been copied to your clipboard.",
      })
    } catch (error) {
      toast.error("Failed to copy", {
        description: "Unable to copy the link. Please try again.",
      })
    }
  }

  const handleSettingChange = async (
    key: keyof typeof settings,
    value: boolean,
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    if (shareInfo?.isPublic) {
      try {
        await updateShareSettings({
          threadId: threadId as Id<"threads">,
          settings: newSettings,
        })
      } catch (error) {
        toast.error("Failed to update settings", {
          description: "There was an error updating share settings.",
        })
      }
    }
  }

  if (!shareInfo) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Share Chat
          </DialogTitle>
          <DialogDescription>
            {shareInfo.isPublic
              ? "Your chat is currently shared. Anyone with the link can view it."
              : "Share this chat with others by generating a public link."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {shareInfo.isPublic ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="share-link">Share link</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-link"
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Share settings</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-thinking">Show thinking process</Label>
                    <p className="text-xs text-muted-foreground">
                      Display AI reasoning and thought process
                    </p>
                  </div>
                  <Switch
                    id="show-thinking"
                    checked={settings.showThinking}
                    onCheckedChange={(checked) =>
                      handleSettingChange("showThinking", checked)
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Generate a link to share this chat with others.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {shareInfo.isPublic ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
              <Button variant="destructive" onClick={handleUnshare}>
                Stop sharing
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleShare}>
                <Globe className="h-4 w-4 mr-2" />
                Share chat
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
