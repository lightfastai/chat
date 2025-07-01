"use client";

import { validateApiKey } from "@/lib/ai/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@lightfast/ui/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@lightfast/ui/components/ui/form";
import { Input } from "@lightfast/ui/components/ui/input";
import { useMutation } from "convex/react";
import { ExternalLink, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";
import { SettingsHeader } from "./settings-header";
import { SettingsRow } from "./settings-row";

const OpenAIApiKeyFormSchema = z.object({
	openaiKey: z
		.string()
		.optional()
		.refine(
			(key) => {
				if (!key || key === "********") return true;
				return validateApiKey("openai", key).success;
			},
			{
				message: "Invalid OpenAI API key format.",
			},
		),
});
type OpenAIApiKeyFormValues = z.infer<typeof OpenAIApiKeyFormSchema>;

const AnthropicApiKeyFormSchema = z.object({
	anthropicKey: z
		.string()
		.optional()
		.refine(
			(key) => {
				if (!key || key === "********") return true;
				return validateApiKey("anthropic", key).success;
			},
			{
				message: "Invalid Anthropic API key format.",
			},
		),
});
type AnthropicApiKeyFormValues = z.infer<typeof AnthropicApiKeyFormSchema>;

const OpenRouterApiKeyFormSchema = z.object({
	openrouterKey: z
		.string()
		.optional()
		.refine(
			(key) => {
				if (!key || key === "********") return true;
				return validateApiKey("openrouter", key).success;
			},
			{
				message: "Invalid OpenRouter API key format.",
			},
		),
});
type OpenRouterApiKeyFormValues = z.infer<typeof OpenRouterApiKeyFormSchema>;

interface ApiKeysSectionProps {
	userSettings:
		| {
				hasOpenAIKey: boolean;
				hasAnthropicKey: boolean;
				hasOpenRouterKey: boolean;
		  }
		| null
		| undefined;
}

export function ApiKeysSection({ userSettings }: ApiKeysSectionProps) {
	const [showOpenAI, setShowOpenAI] = useState(false);
	const [showAnthropic, setShowAnthropic] = useState(false);
	const [showOpenRouter, setShowOpenRouter] = useState(false);

	const updateApiKeys = useMutation(api.userSettings.updateApiKeys);
	const removeApiKey = useMutation(api.userSettings.removeApiKey);

	const openaiForm = useForm<OpenAIApiKeyFormValues>({
		resolver: zodResolver(OpenAIApiKeyFormSchema),
		defaultValues: {
			openaiKey: "",
		},
		mode: "onChange",
	});

	const anthropicForm = useForm<AnthropicApiKeyFormValues>({
		resolver: zodResolver(AnthropicApiKeyFormSchema),
		defaultValues: {
			anthropicKey: "",
		},
		mode: "onChange",
	});

	const openrouterForm = useForm<OpenRouterApiKeyFormValues>({
		resolver: zodResolver(OpenRouterApiKeyFormSchema),
		defaultValues: {
			openrouterKey: "",
		},
		mode: "onChange",
	});

	useEffect(() => {
		if (userSettings) {
			openaiForm.reset({
				openaiKey: userSettings.hasOpenAIKey ? "********" : "",
			});
			anthropicForm.reset({
				anthropicKey: userSettings.hasAnthropicKey ? "********" : "",
			});
			openrouterForm.reset({
				openrouterKey: userSettings.hasOpenRouterKey ? "********" : "",
			});
		}
	}, [userSettings, openaiForm, anthropicForm, openrouterForm]);

	const onOpenAISubmit = async (values: OpenAIApiKeyFormValues) => {
		const { openaiKey } = values;
		if (!openaiKey || openaiKey === "********") {
			toast.error("Please enter a new OpenAI API key to save.");
			return;
		}

		try {
			await updateApiKeys({ openaiKey });
			toast.success("OpenAI API key updated successfully.");
			openaiForm.reset({ openaiKey: "********" });
		} catch (error) {
			console.error("Error updating OpenAI API key:", error);
			toast.error("Failed to update OpenAI API key. Please try again.");
		}
	};

	const onAnthropicSubmit = async (values: AnthropicApiKeyFormValues) => {
		const { anthropicKey } = values;
		if (!anthropicKey || anthropicKey === "********") {
			toast.error("Please enter a new Anthropic API key to save.");
			return;
		}

		try {
			await updateApiKeys({ anthropicKey });
			toast.success("Anthropic API key updated successfully.");
			anthropicForm.reset({ anthropicKey: "********" });
		} catch (error) {
			console.error("Error updating Anthropic API key:", error);
			toast.error("Failed to update Anthropic API key. Please try again.");
		}
	};

	const onOpenRouterSubmit = async (values: OpenRouterApiKeyFormValues) => {
		const { openrouterKey } = values;
		if (!openrouterKey || openrouterKey === "********") {
			toast.error("Please enter a new OpenRouter API key to save.");
			return;
		}

		try {
			await updateApiKeys({ openrouterKey });
			toast.success("OpenRouter API key updated successfully.");
			openrouterForm.reset({ openrouterKey: "********" });
		} catch (error) {
			console.error("Error updating OpenRouter API key:", error);
			toast.error("Failed to update OpenRouter API key. Please try again.");
		}
	};

	const handleRemoveApiKey = async (
		provider: "openai" | "anthropic" | "openrouter",
	) => {
		try {
			await removeApiKey({ provider });
			toast.success(
				`${provider === "openai" ? "OpenAI" : provider === "anthropic" ? "Anthropic" : "OpenRouter"} API key removed.`,
			);
			if (provider === "openai") {
				openaiForm.setValue("openaiKey", "");
			} else if (provider === "anthropic") {
				anthropicForm.setValue("anthropicKey", "");
			} else {
				openrouterForm.setValue("openrouterKey", "");
			}
		} catch (error) {
			toast.error("Failed to remove API key.");
		}
	};

	return (
		<div>
			<SettingsHeader title="API Keys" badge="Beta" />

			<div className="mt-6 divide-y divide-border">
				{/* OpenAI */}
				<Form {...openaiForm}>
					<form onSubmit={openaiForm.handleSubmit(onOpenAISubmit)}>
						<SettingsRow
							title="OpenAI"
							description={
								<span>
									Used for GPT models.{" "}
									<Link
										href="https://platform.openai.com/api-keys"
										target="_blank"
										className="inline-flex items-center text-muted-foreground hover:underline"
									>
										Get API Key
										<ExternalLink className="ml-1 h-3 w-3" />
									</Link>
								</span>
							}
						>
							<FormField
								control={openaiForm.control}
								name="openaiKey"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="sr-only">OpenAI API Key</FormLabel>
										<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
											<div className="relative flex-1 sm:flex-initial">
												<FormControl>
													<Input
														{...field}
														type={showOpenAI ? "text" : "password"}
														placeholder="sk-..."
														className="w-full pr-10 sm:w-48"
														onFocus={(e) => {
															if (e.target.value === "********") {
																openaiForm.setValue("openaiKey", "");
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
											<div className="flex gap-2">
												<Button
													type="submit"
													size="sm"
													disabled={openaiForm.formState.isSubmitting}
												>
													{openaiForm.formState.isSubmitting && (
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													)}
													Save
												</Button>
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
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						</SettingsRow>
					</form>
				</Form>

				{/* Anthropic */}
				<Form {...anthropicForm}>
					<form onSubmit={anthropicForm.handleSubmit(onAnthropicSubmit)}>
						<SettingsRow
							title="Anthropic"
							description={
								<span>
									Used for Claude models.{" "}
									<Link
										href="https://console.anthropic.com/settings/keys"
										target="_blank"
										className="inline-flex items-center text-muted-foreground hover:underline"
									>
										Get API Key
										<ExternalLink className="ml-1 h-3 w-3" />
									</Link>
								</span>
							}
						>
							<FormField
								control={anthropicForm.control}
								name="anthropicKey"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="sr-only">Anthropic API Key</FormLabel>
										<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
											<div className="relative flex-1 sm:flex-initial">
												<FormControl>
													<Input
														{...field}
														type={showAnthropic ? "text" : "password"}
														placeholder="sk-ant-..."
														className="w-full pr-10 sm:w-48"
														onFocus={(e) => {
															if (e.target.value === "********") {
																anthropicForm.setValue("anthropicKey", "");
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
											<div className="flex gap-2">
												<Button
													type="submit"
													size="sm"
													disabled={anthropicForm.formState.isSubmitting}
												>
													{anthropicForm.formState.isSubmitting && (
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													)}
													Save
												</Button>
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
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						</SettingsRow>
					</form>
				</Form>

				{/* OpenRouter */}
				<Form {...openrouterForm}>
					<form onSubmit={openrouterForm.handleSubmit(onOpenRouterSubmit)}>
						<SettingsRow
							title="OpenRouter"
							description={
								<span>
									Used for OpenRouter models (Llama, Gemini, etc.).{" "}
									<Link
										href="https://openrouter.ai/keys"
										target="_blank"
										className="inline-flex items-center text-muted-foreground hover:underline"
									>
										Get API Key
										<ExternalLink className="ml-1 h-3 w-3" />
									</Link>
								</span>
							}
						>
							<FormField
								control={openrouterForm.control}
								name="openrouterKey"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="sr-only">
											OpenRouter API Key
										</FormLabel>
										<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
											<div className="relative flex-1 sm:flex-initial">
												<FormControl>
													<Input
														{...field}
														type={showOpenRouter ? "text" : "password"}
														placeholder="sk-or-..."
														className="w-full pr-10 sm:w-48"
														onFocus={(e) => {
															if (e.target.value === "********") {
																openrouterForm.setValue("openrouterKey", "");
															}
														}}
													/>
												</FormControl>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="absolute right-0 top-0 h-full px-3"
													onClick={() => setShowOpenRouter(!showOpenRouter)}
												>
													{showOpenRouter ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
											<div className="flex gap-2">
												<Button
													type="submit"
													size="sm"
													disabled={openrouterForm.formState.isSubmitting}
												>
													{openrouterForm.formState.isSubmitting && (
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													)}
													Save
												</Button>
												{userSettings?.hasOpenRouterKey && (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => handleRemoveApiKey("openrouter")}
														className="text-red-600 hover:text-red-700"
													>
														Remove
													</Button>
												)}
											</div>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						</SettingsRow>
					</form>
				</Form>
			</div>
		</div>
	);
}
