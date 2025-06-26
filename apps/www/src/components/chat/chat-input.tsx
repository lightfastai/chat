"use client";

import { useFileDrop } from "@/hooks/use-file-drop";
import {
	DEFAULT_MODEL_ID,
	type ModelId,
	getModelConfig,
	getVisibleModels,
} from "@/lib/ai";
import { Button } from "@lightfast/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@lightfast/ui/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@lightfast/ui/components/ui/scroll-area";
import { Textarea } from "@lightfast/ui/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@lightfast/ui/components/ui/tooltip";
import { useMutation } from "convex/react";
import {
	ArrowUp,
	ChevronDown,
	FileIcon,
	FileText,
	Globe,
	Image,
	Loader2,
	Paperclip,
	X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useKeyboardShortcutsContext } from "../providers/keyboard-shortcuts-provider";

interface ChatInputProps {
	onSendMessage: (
		message: string,
		modelId: string,
		attachments?: Id<"files">[],
		webSearchEnabled?: boolean,
	) => Promise<void> | void;
	isLoading?: boolean;
	placeholder?: string;
	disabled?: boolean;
	maxLength?: number;
	className?: string;
	showDisclaimer?: boolean;
	value?: string;
	onChange?: (value: string) => void;
}

interface FileAttachment {
	id: Id<"files">;
	name: string;
	size: number;
	type: string;
	url?: string;
}

const ChatInputComponent = ({
	onSendMessage,
	isLoading = false,
	placeholder = "How can I help you today?",
	disabled = false,
	maxLength = 4000,
	className = "",
	showDisclaimer = true,
	value,
	onChange,
}: ChatInputProps) => {
	const [internalMessage, setInternalMessage] = useState("");

	// Use controlled value if provided, otherwise use internal state
	const message = value !== undefined ? value : internalMessage;
	const setMessage =
		value !== undefined ? onChange || (() => {}) : setInternalMessage;
	const [isSending, setIsSending] = useState(false);

	// Initialize selectedModelId from sessionStorage to persist across navigation
	const [selectedModelId, setSelectedModelId] = useState<string>(() => {
		if (typeof window !== "undefined") {
			const storedModel = sessionStorage.getItem("selectedModelId");
			return storedModel || DEFAULT_MODEL_ID;
		}
		return DEFAULT_MODEL_ID;
	});

	const [attachments, setAttachments] = useState<FileAttachment[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [webSearchEnabled, setWebSearchEnabled] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const generateUploadUrl = useMutation(api.files.generateUploadUrl);
	const createFile = useMutation(api.files.createFile);

	// Determine if submission should be disabled (but allow typing)
	const isSubmitDisabled = useMemo(
		() => disabled || isLoading || isSending,
		[disabled, isLoading, isSending],
	);

	// Memoize expensive computations
	const allModels = useMemo(() => getVisibleModels(), []);
	const selectedModel = useMemo(
		() => getModelConfig(selectedModelId as ModelId),
		[selectedModelId],
	);

	// Memoize models grouping
	const modelsByProvider = useMemo(() => {
		return allModels.reduce(
			(acc, model) => {
				if (!acc[model.provider]) {
					acc[model.provider] = [];
				}
				acc[model.provider].push(model);
				return acc;
			},
			{} as Record<string, typeof allModels>,
		);
	}, [allModels]);

	// Provider display names
	const providerNames: Record<string, string> = {
		openai: "OpenAI",
		anthropic: "Anthropic",
		openrouter: "OpenRouter",
	};

	// Memoize textarea height adjustment
	const adjustTextareaHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		// Reset height to get accurate scrollHeight
		textarea.style.height = "auto";
		// Let textarea grow naturally, container will handle overflow
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, []);

	useEffect(() => {
		adjustTextareaHeight();
	}, [message, adjustTextareaHeight]);

	// Auto-focus the textarea when component mounts
	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	// File upload handler
	const handleFileUpload = useCallback(
		async (files: FileList) => {
			if (files.length === 0) return;

			setIsUploading(true);
			const newAttachments: FileAttachment[] = [];

			try {
				for (const file of Array.from(files)) {
					// Validate file size (10MB max)
					if (file.size > 10 * 1024 * 1024) {
						const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
						toast.error(
							`${file.name} is ${sizeInMB}MB. Maximum file size is 10MB`,
						);
						continue;
					}

					// Generate upload URL
					const uploadUrl = await generateUploadUrl();

					// Upload the file
					const result = await fetch(uploadUrl, {
						method: "POST",
						headers: { "Content-Type": file.type },
						body: file,
					});

					if (!result.ok) {
						throw new Error(`Failed to upload ${file.name}. Please try again.`);
					}

					const { storageId } = await result.json();

					// Create file record in database
					const fileId = await createFile({
						storageId,
						fileName: file.name,
						fileType: file.type,
						fileSize: file.size,
					});

					newAttachments.push({
						id: fileId,
						name: file.name,
						size: file.size,
						type: file.type,
					});
				}

				if (newAttachments.length === 0 && files.length > 0) {
					toast.error(
						"No files were uploaded. Please check file types and sizes.",
					);
				} else {
					setAttachments([...attachments, ...newAttachments]);
					if (newAttachments.length === 1) {
						toast.success(`${newAttachments[0].name} uploaded successfully`);
					} else if (newAttachments.length > 1) {
						toast.success(
							`${newAttachments.length} files uploaded successfully`,
						);
					}
				}
			} catch (error) {
				console.error("Error uploading files:", error);

				if (error instanceof Error) {
					// Show specific error messages from backend
					if (error.message.includes("sign in")) {
						toast.error("Please sign in to upload files");
					} else if (error.message.includes("file type")) {
						toast.error(error.message);
					} else if (error.message.includes("too large")) {
						toast.error(error.message);
					} else {
						toast.error(`Upload failed: ${error.message}`);
					}
				} else {
					toast.error("Failed to upload files. Please try again.");
				}
			} finally {
				setIsUploading(false);
			}
		},
		[attachments, generateUploadUrl, createFile],
	);

	// Use the file drop hook
	const { isDragging, dragHandlers } = useFileDrop({
		onDrop: handleFileUpload,
		disabled: isSubmitDisabled || isUploading,
	});

	const handleFileInputChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (files && files.length > 0) {
				await handleFileUpload(files);
			}
		},
		[handleFileUpload],
	);

	const removeAttachment = useCallback((id: Id<"files">) => {
		setAttachments((prev) => prev.filter((att) => att.id !== id));
	}, []);

	// Memoize event handlers
	const handleSendMessage = useCallback(async () => {
		if (!message.trim()) return;

		// Check if files are still uploading
		if (isUploading) {
			toast.info("Please wait for file uploads to complete before sending");
			return;
		}

		// Show visual indicator if submit is disabled
		if (isSubmitDisabled) {
			toast.info("Please wait for the current response to complete");
			return;
		}

		setIsSending(true);

		try {
			const attachmentIds = attachments.map((att) => att.id);
			await onSendMessage(
				message,
				selectedModelId,
				attachmentIds.length > 0 ? attachmentIds : undefined,
				webSearchEnabled,
			);
			setMessage("");
			setAttachments([]);
		} catch (error) {
			console.error("Error sending message:", error);

			// Handle specific error types gracefully with toast notifications
			if (error instanceof Error) {
				if (error.message.includes("Please wait for the current")) {
					toast.error(
						"AI is currently responding. Please wait for the response to complete before sending another message.",
					);
				} else if (error.message.includes("Thread not found")) {
					toast.error("This conversation is no longer available.");
				} else if (error.message.includes("User must be authenticated")) {
					toast.error("Please sign in to continue chatting.");
				} else {
					toast.error("Failed to send message. Please try again.");
				}
			} else {
				toast.error("An unexpected error occurred. Please try again.");
			}
		} finally {
			setIsSending(false);
		}
	}, [
		message,
		isUploading,
		isSubmitDisabled,
		onSendMessage,
		selectedModelId,
		attachments,
		webSearchEnabled,
		setMessage,
	]);

	const handleKeyPress = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSendMessage();
			}
		},
		[handleSendMessage],
	);

	const handleMessageChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setMessage(e.target.value);
		},
		[setMessage],
	);

	const [dropdownOpen, setDropdownOpen] = useState(false);
	const keyboardShortcuts = useKeyboardShortcutsContext();

	const handleModelChange = useCallback((value: string) => {
		setSelectedModelId(value);
		// Persist to sessionStorage to maintain selection across navigation
		if (typeof window !== "undefined") {
			sessionStorage.setItem("selectedModelId", value);
		}
		setDropdownOpen(false);
	}, []);

	const toggleModelSelector = useCallback(() => {
		setDropdownOpen((prev) => !prev);
	}, []);

	// Register model selector toggle with keyboard shortcuts context
	// Only register when textarea is focused
	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const handleFocus = () => {
			keyboardShortcuts.registerModelSelectorToggle(toggleModelSelector);
		};

		const handleBlur = () => {
			keyboardShortcuts.unregisterModelSelectorToggle();
		};

		textarea.addEventListener("focus", handleFocus);
		textarea.addEventListener("blur", handleBlur);

		// If already focused, register immediately
		if (document.activeElement === textarea) {
			keyboardShortcuts.registerModelSelectorToggle(toggleModelSelector);
		}

		return () => {
			textarea.removeEventListener("focus", handleFocus);
			textarea.removeEventListener("blur", handleBlur);
			keyboardShortcuts.unregisterModelSelectorToggle();
		};
	}, [keyboardShortcuts, toggleModelSelector]);

	const handleWebSearchToggle = useCallback(() => {
		setWebSearchEnabled((prev) => !prev);
	}, []);

	// Memoize computed values
	const canSend = useMemo(
		() => message.trim() && !isSubmitDisabled,
		[message, isSubmitDisabled],
	);

	// Helper function to format file size
	const formatFileSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	return (
		<div
			className={`pb-2 md:pb-4 flex-shrink-0 ${className}`}
			{...dragHandlers}
		>
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
							className={`w-full border border-muted/30 rounded-xl overflow-hidden flex flex-col transition-all bg-transparent dark:bg-input/10 ${
								attachments.length > 0 ? "rounded-b-none" : ""
							} ${isLoading ? "opacity-75" : ""}`}
						>
							{/* Textarea area - grows with content up to max height */}
							<div className="flex-1 max-h-[180px] overflow-y-auto chat-input-scroll">
								<Textarea
									ref={textareaRef}
									value={message}
									onChange={handleMessageChange}
									onKeyPress={handleKeyPress}
									placeholder={placeholder}
									className="w-full resize-none border-0 focus-visible:ring-0 whitespace-pre-wrap break-words p-3 bg-transparent dark:bg-input/10 focus:bg-transparent dark:focus:bg-input/10 hover:bg-transparent dark:hover:bg-input/10 disabled:bg-transparent dark:disabled:bg-input/10"
									maxLength={maxLength}
									disabled={disabled}
									autoComplete="off"
									autoCorrect="off"
									autoCapitalize="off"
									spellCheck="true"
									data-1p-ignore="true"
									data-lpignore="true"
									data-form-type="other"
									style={{
										lineHeight: "24px",
										minHeight: "72px",
									}}
								/>
							</div>

							{/* Controls area - always at bottom */}
							<div className="flex items-center justify-between p-2 bg-transparent dark:bg-input/10 transition-[color,box-shadow]">
								<div className="flex items-center gap-2">
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
												size="icon"
												onClick={() => fileInputRef.current?.click()}
												disabled={disabled || isUploading}
												className="h-8 w-8"
											>
												{isUploading ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<Paperclip className="w-4 h-4" />
												)}
											</Button>
										</TooltipTrigger>
										<TooltipContent side="bottom">
											<p>Attach files</p>
										</TooltipContent>
									</Tooltip>

									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												onClick={handleWebSearchToggle}
												variant={webSearchEnabled ? "default" : "ghost"}
												size="icon"
												className="h-8 w-8"
												disabled={disabled}
											>
												<Globe className="w-4 h-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent side="bottom">
											<p>
												{webSearchEnabled
													? "Web search enabled - AI can search the web for current information"
													: "Enable web search for current information"}
											</p>
										</TooltipContent>
									</Tooltip>
								</div>

								<div className="flex items-center gap-2">
									{/* Model selector */}
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
										<DropdownMenuContent align="end" className="w-52">
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

									{/* Send button */}
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												onClick={handleSendMessage}
												disabled={!canSend}
												size="icon"
												className="h-8 w-8 p-0 rounded-full"
											>
												<ArrowUp className="w-4 h-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Send message (Enter)</p>
										</TooltipContent>
									</Tooltip>
								</div>
							</div>
						</div>

						{/* Attachments container - appears below input */}
						{attachments.length > 0 && (
							<div className="w-full border border-t-0 border-muted/30 rounded-b-xl bg-transparent dark:bg-input/10 transition-all animate-in slide-in-from-top-1 duration-200">
								<ScrollArea className="w-full">
									<div className="flex gap-2 p-3">
										{attachments.map((attachment) => {
											const isImage = attachment.type.startsWith("image/");
											const isPdf = attachment.type === "application/pdf";

											return (
												<div
													key={attachment.id}
													className="flex items-center gap-2 px-3 py-2 bg-background rounded-md border text-sm group hover:border-foreground/20 transition-colors flex-shrink-0"
												>
													{isImage ? (
														<Image className="w-4 h-4 text-muted-foreground flex-shrink-0" />
													) : isPdf ? (
														<FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
													) : (
														<FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
													)}
													<div className="min-w-0">
														<p className="truncate max-w-[150px] font-medium">
															{attachment.name}
														</p>
														<p className="text-xs text-muted-foreground whitespace-nowrap">
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
											);
										})}
									</div>
									<ScrollBar orientation="horizontal" />
								</ScrollArea>
							</div>
						)}
					</div>
				</div>

				{/* Disclaimer text */}
				{showDisclaimer && (
					<p className="text-center text-xs text-muted-foreground mt-4">
						Lightfast may make mistakes. Please use with discretion.
					</p>
				)}
			</div>
		</div>
	);
};

// Memoize the entire component to prevent unnecessary re-renders
export const ChatInput = memo(ChatInputComponent);
