"use client"

import {
  SettingsItem,
  SettingsItemWithStatus,
} from "@/components/settings/settings-item"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation, useQuery } from "convex/react"
import { ExternalLink, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"

export function ApiKeysManager() {
  const [showOpenAI, setShowOpenAI] = useState(false)
  const [showAnthropic, setShowAnthropic] = useState(false)
  const [openaiKey, setOpenaiKey] = useState("")
  const [anthropicKey, setAnthropicKey] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Get user settings to check if they have API keys
  const userSettings = useQuery(api.userSettings.getUserSettings)
  const updateApiKeys = useMutation(api.userSettings.updateApiKeys)
  const removeApiKey = useMutation(api.userSettings.removeApiKey)

  const handleSaveApiKeys = async () => {
    if (!openaiKey && !anthropicKey) {
      toast.error("Please enter at least one API key")
      return
    }

    setIsUpdating(true)
    try {
      await updateApiKeys({
        openaiKey: openaiKey || undefined,
        anthropicKey: anthropicKey || undefined,
      })

      toast.success("API keys updated successfully")
      setOpenaiKey("")
      setAnthropicKey("")
    } catch (error) {
      console.error("Error updating API keys:", error)
      toast.error("Failed to update API keys. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveApiKey = async (provider: "openai" | "anthropic") => {
    try {
      await removeApiKey({ provider })
      toast.success(
        `${provider === "openai" ? "OpenAI" : "Anthropic"} API key removed`,
      )
    } catch (error) {
      console.error("Error removing API key:", error)
      toast.error("Failed to remove API key. Please try again.")
    }
  }

  return (
    <div className="divide-y">
      {/* OpenAI API Key */}
      <SettingsItemWithStatus
        title="OpenAI API Key"
        description="Use your own OpenAI API key for GPT models (gpt-4o, gpt-4o-mini, gpt-3.5-turbo)"
        status={userSettings?.hasOpenAIKey ? "Configured" : undefined}
        statusVariant={userSettings?.hasOpenAIKey ? "success" : "default"}
      >
        <div className="flex flex-col gap-3">
          {userSettings?.hasOpenAIKey ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveApiKey("openai")}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-3 w-64">
              <div className="space-y-2">
                <Label htmlFor="openai-key" className="text-sm">
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    id="openai-key"
                    type={showOpenAI ? "text" : "password"}
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowOpenAI(!showOpenAI)}
                  >
                    {showOpenAI ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Get your API key from</span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  OpenAI Platform
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </SettingsItemWithStatus>

      {/* Anthropic API Key */}
      <SettingsItemWithStatus
        title="Anthropic API Key"
        description="Use your own Anthropic API key for Claude models (Sonnet 4, Claude 3.5, Haiku)"
        status={userSettings?.hasAnthropicKey ? "Configured" : undefined}
        statusVariant={userSettings?.hasAnthropicKey ? "success" : "default"}
      >
        <div className="flex flex-col gap-3">
          {userSettings?.hasAnthropicKey ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveApiKey("anthropic")}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-3 w-64">
              <div className="space-y-2">
                <Label htmlFor="anthropic-key" className="text-sm">
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    id="anthropic-key"
                    type={showAnthropic ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowAnthropic(!showAnthropic)}
                  >
                    {showAnthropic ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Get your API key from</span>
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Anthropic Console
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </SettingsItemWithStatus>

      {/* Save Button */}
      {(openaiKey || anthropicKey) && (
        <SettingsItem
          title="Save Changes"
          description="Apply your API key changes"
        >
          <Button
            onClick={handleSaveApiKeys}
            disabled={isUpdating}
            className="min-w-24"
          >
            {isUpdating ? "Saving..." : "Save"}
          </Button>
        </SettingsItem>
      )}

      {/* Security Information */}
      <SettingsItem
        title="Security & Privacy"
        description="Your API keys are encrypted and stored securely. Keys are only decrypted when making API calls to the respective providers."
      >
        <div className="text-sm text-muted-foreground">
          <div className="space-y-1">
            <p>• Encrypted storage in database</p>
            <p>• Decrypted only for API calls</p>
            <p>• Removable at any time</p>
            <p>• Fallback to default keys</p>
          </div>
        </div>
      </SettingsItem>
    </div>
  )
}
