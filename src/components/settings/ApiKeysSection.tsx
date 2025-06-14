"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { validateApiKeyFormat } from "@/lib/ai/apiKeyValidation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { ExternalLink, Eye, EyeOff, Key, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { api } from "../../../convex/_generated/api"

const OpenAIApiKeyFormSchema = z.object({
  openaiKey: z
    .string()
    .optional()
    .refine(
      (key) => {
        if (!key || key === "********") return true
        return validateApiKeyFormat(key, "openai")
      },
      {
        message: "Invalid OpenAI API key format.",
      },
    ),
})
type OpenAIApiKeyFormValues = z.infer<typeof OpenAIApiKeyFormSchema>

const AnthropicApiKeyFormSchema = z.object({
  anthropicKey: z
    .string()
    .optional()
    .refine(
      (key) => {
        if (!key || key === "********") return true
        return validateApiKeyFormat(key, "anthropic")
      },
      {
        message: "Invalid Anthropic API key format.",
      },
    ),
})
type AnthropicApiKeyFormValues = z.infer<typeof AnthropicApiKeyFormSchema>

export function ApiKeysSection() {
  const [showOpenAI, setShowOpenAI] = useState(false)
  const [showAnthropic, setShowAnthropic] = useState(false)

  const userSettings = useQuery(api.userSettings.getUserSettings)
  const updateApiKeys = useMutation(api.userSettings.updateApiKeys)
  const removeApiKey = useMutation(api.userSettings.removeApiKey)

  const openaiForm = useForm<OpenAIApiKeyFormValues>({
    resolver: zodResolver(OpenAIApiKeyFormSchema),
    defaultValues: {
      openaiKey: "",
    },
    mode: "onChange",
  })

  const anthropicForm = useForm<AnthropicApiKeyFormValues>({
    resolver: zodResolver(AnthropicApiKeyFormSchema),
    defaultValues: {
      anthropicKey: "",
    },
    mode: "onChange",
  })

  useEffect(() => {
    if (userSettings) {
      openaiForm.reset({
        openaiKey: userSettings.hasOpenAIKey ? "********" : "",
      })
      anthropicForm.reset({
        anthropicKey: userSettings.hasAnthropicKey ? "********" : "",
      })
    }
  }, [userSettings, openaiForm, anthropicForm])

  const onOpenAISubmit = async (values: OpenAIApiKeyFormValues) => {
    const { openaiKey } = values
    if (!openaiKey || openaiKey === "********") {
      toast.error("Please enter a new OpenAI API key to save.")
      return
    }

    try {
      await updateApiKeys({ openaiKey })
      toast.success("OpenAI API key updated successfully.")
      openaiForm.reset({ openaiKey: "********" })
    } catch (error) {
      console.error("Error updating OpenAI API key:", error)
      toast.error("Failed to update OpenAI API key. Please try again.")
    }
  }

  const onAnthropicSubmit = async (values: AnthropicApiKeyFormValues) => {
    const { anthropicKey } = values
    if (!anthropicKey || anthropicKey === "********") {
      toast.error("Please enter a new Anthropic API key to save.")
      return
    }

    try {
      await updateApiKeys({ anthropicKey })
      toast.success("Anthropic API key updated successfully.")
      anthropicForm.reset({ anthropicKey: "********" })
    } catch (error) {
      console.error("Error updating Anthropic API key:", error)
      toast.error("Failed to update Anthropic API key. Please try again.")
    }
  }

  const handleRemoveApiKey = async (provider: "openai" | "anthropic") => {
    try {
      await removeApiKey({ provider })
      toast.success(
        `${provider === "openai" ? "OpenAI" : "Anthropic"} API key removed.`,
      )
      if (provider === "openai") {
        openaiForm.setValue("openaiKey", "")
      } else {
        anthropicForm.setValue("anthropicKey", "")
      }
    } catch (error) {
      toast.error("Failed to remove API key.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">API Keys</h3>
        <p className="text-sm text-muted-foreground">
          Add your own API keys to use your personal accounts for AI
          interactions. Your keys are encrypted and stored securely.
        </p>
      </div>

      <div className="space-y-4">
        <Form {...openaiForm}>
          <form
            onSubmit={openaiForm.handleSubmit(onOpenAISubmit)}
            className="space-y-4"
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4" />
                    <CardTitle className="text-base">OpenAI API Key</CardTitle>
                    {userSettings?.hasOpenAIKey && (
                      <Badge variant="secondary" className="text-xs">
                        Configured
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        "https://platform.openai.com/api-keys",
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <CardDescription>Used for GPT models.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={openaiForm.control}
                  name="openaiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">OpenAI API Key</FormLabel>
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <FormControl>
                            <Input
                              {...field}
                              type={showOpenAI ? "text" : "password"}
                              placeholder="sk-..."
                              onFocus={(e) => {
                                if (e.target.value === "********") {
                                  openaiForm.setValue("openaiKey", "")
                                }
                              }}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowOpenAI(!showOpenAI)}
                          >
                            {showOpenAI ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {userSettings?.hasOpenAIKey && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveApiKey("openai")}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={openaiForm.formState.isSubmitting}
                  >
                    {openaiForm.formState.isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>

        <Form {...anthropicForm}>
          <form
            onSubmit={anthropicForm.handleSubmit(onAnthropicSubmit)}
            className="space-y-4"
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4" />
                    <CardTitle className="text-base">
                      Anthropic API Key
                    </CardTitle>
                    {userSettings?.hasAnthropicKey && (
                      <Badge variant="secondary" className="text-xs">
                        Configured
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        "https://console.anthropic.com/settings/keys",
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <CardDescription>Used for Claude models.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={anthropicForm.control}
                  name="anthropicKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">
                        Anthropic API Key
                      </FormLabel>
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <FormControl>
                            <Input
                              {...field}
                              type={showAnthropic ? "text" : "password"}
                              placeholder="sk-ant-..."
                              onFocus={(e) => {
                                if (e.target.value === "********") {
                                  anthropicForm.setValue("anthropicKey", "")
                                }
                              }}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowAnthropic(!showAnthropic)}
                          >
                            {showAnthropic ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {userSettings?.hasAnthropicKey && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveApiKey("anthropic")}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={anthropicForm.formState.isSubmitting}
                  >
                    {anthropicForm.formState.isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  )
}
