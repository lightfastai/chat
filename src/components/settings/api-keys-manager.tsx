"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
// import { api } from "../../../convex/_generated/api"
// import { useMutation, useQuery } from "convex/react"
import { Eye, EyeOff, Key, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function ApiKeysManager() {
  const [showOpenAI, setShowOpenAI] = useState(false)
  const [showAnthropic, setShowAnthropic] = useState(false)
  const [openaiKey, setOpenaiKey] = useState("")
  const [anthropicKey, setAnthropicKey] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Get user settings to check if they have API keys
  // TODO: Uncomment when Convex API is regenerated
  // const userSettings = useQuery(api.userSettings.getUserSettings)
  // const updateApiKeys = useMutation(api.userSettings.updateApiKeys)
  // const removeApiKey = useMutation(api.userSettings.removeApiKey)
  const userSettings = { hasOpenAIKey: false, hasAnthropicKey: false }
  const updateApiKeys = async (_args: {
    openaiKey?: string
    anthropicKey?: string
  }) => {}
  const removeApiKey = async (_args: { provider: "openai" | "anthropic" }) => {}

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
    <div className="space-y-6">
      {/* OpenAI API Key */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <CardTitle>OpenAI API Key</CardTitle>
            </div>
            {userSettings?.hasOpenAIKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveApiKey("openai")}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
          <CardDescription>
            Use your own OpenAI API key for GPT models (gpt-4o, gpt-4o-mini,
            gpt-3.5-turbo)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userSettings?.hasOpenAIKey ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
              <Key className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">
                OpenAI API key is configured
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="openai-key">API Key</Label>
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
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  OpenAI Platform
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anthropic API Key */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <CardTitle>Anthropic API Key</CardTitle>
            </div>
            {userSettings?.hasAnthropicKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveApiKey("anthropic")}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
          <CardDescription>
            Use your own Anthropic API key for Claude models (Claude Sonnet 4,
            Claude 3.5, Claude Haiku)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userSettings?.hasAnthropicKey ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
              <Key className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">
                Anthropic API key is configured
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">API Key</Label>
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
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Anthropic Console
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {(openaiKey || anthropicKey) && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleSaveApiKeys}
              disabled={isUpdating}
              className="w-full"
            >
              {isUpdating ? "Saving..." : "Save API Keys"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Your API keys are encrypted and stored securely in our database
          </p>
          <p>
            • Keys are only decrypted when making API calls to the respective
            providers
          </p>
          <p>• You can remove your keys at any time</p>
          <p>
            • If no personal keys are provided, we'll use our default API keys
          </p>
          <p>
            • Usage and billing are handled directly by the API provider
            (OpenAI/Anthropic)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
