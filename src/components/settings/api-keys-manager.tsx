"use client"

import { SettingsSection } from "@/components/settings/settings-section"
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
import { useMutation, useQuery } from "convex/react"
import { Check, ExternalLink, Eye, EyeOff, Key, Trash2 } from "lucide-react"
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
    <div className="space-y-8">
      {/* OpenAI Section */}
      <SettingsSection
        title="OpenAI"
        description="Configure your OpenAI API key to use GPT models with your own account."
      >
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">API Key</CardTitle>
                  <CardDescription className="text-sm">
                    Access GPT models (gpt-4o, gpt-4o-mini, gpt-3.5-turbo)
                  </CardDescription>
                </div>
              </div>
              {userSettings?.hasOpenAIKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveApiKey("openai")}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {userSettings?.hasOpenAIKey ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20">
                <Check className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    API key configured
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Your OpenAI API key is active and ready to use
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="openai-key" className="text-sm font-medium">
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
          </CardContent>
        </Card>
      </SettingsSection>

      {/* Anthropic Section */}
      <SettingsSection
        title="Anthropic"
        description="Configure your Anthropic API key to use Claude models with your own account."
      >
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">API Key</CardTitle>
                  <CardDescription className="text-sm">
                    Access Claude models (Sonnet 4, Claude 3.5, Haiku)
                  </CardDescription>
                </div>
              </div>
              {userSettings?.hasAnthropicKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveApiKey("anthropic")}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {userSettings?.hasAnthropicKey ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20">
                <Check className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    API key configured
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Your Anthropic API key is active and ready to use
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="anthropic-key"
                    className="text-sm font-medium"
                  >
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
          </CardContent>
        </Card>
      </SettingsSection>

      {/* Save Actions */}
      {(openaiKey || anthropicKey) && (
        <div className="flex justify-end border-t pt-6">
          <Button
            onClick={handleSaveApiKeys}
            disabled={isUpdating}
            className="min-w-24"
          >
            {isUpdating ? "Saving..." : "Save"}
          </Button>
        </div>
      )}

      {/* Security Information */}
      <SettingsSection
        title="Security & Privacy"
        description="How we handle and protect your API keys."
      >
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="mt-1">•</div>
                <div>
                  Your API keys are encrypted and stored securely in our
                  database
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1">•</div>
                <div>
                  Keys are only decrypted when making API calls to the
                  respective providers
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1">•</div>
                <div>You can remove your keys at any time from this page</div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1">•</div>
                <div>
                  If no personal keys are provided, we'll use our default API
                  keys
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1">•</div>
                <div>
                  Usage and billing are handled directly by the API provider
                  (OpenAI/Anthropic)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </SettingsSection>
    </div>
  )
}
