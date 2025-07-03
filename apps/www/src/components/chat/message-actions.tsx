"use client";

import type { ModelId } from "@/lib/ai";
import { nanoid } from "@/lib/nanoid";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
import { Badge } from "@lightfast/ui/components/ui/badge";
import { Button } from "@lightfast/ui/components/ui/button";
import { cn } from "@lightfast/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
	CheckIcon,
	ClipboardIcon,
	Key,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import React from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { FeedbackModal } from "./feedback-modal";
import { MessageUsageChip } from "./message-usage-chip";
import { ModelBranchDropdown } from "./model-branch-dropdown";
import { formatDuration } from "./shared/thinking-content";

interface MessageActionsProps {
	message: Doc<"messages">;
	className?: string;
	modelName?: string;
	thinkingDuration?: number | null;
	onDropdownStateChange?: (isOpen: boolean) => void;
}

export function MessageActions({
	message,
	className,
	modelName,
	thinkingDuration,
	onDropdownStateChange,
}: MessageActionsProps) {
	const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
	const { copy, isCopied } = useCopyToClipboard({ timeout: 2000 });

	// Notify parent when dropdown state changes
	React.useEffect(() => {
		onDropdownStateChange?.(isDropdownOpen);
	}, [isDropdownOpen, onDropdownStateChange]);

	const feedback = useQuery(api.feedback.getUserFeedbackForMessage, {
		messageId: message._id,
	});

	const submitFeedback = useMutation(api.feedback.submitFeedback);
	const removeFeedback = useMutation(api.feedback.removeFeedback);
	const branchThread = useMutation(
		api.threads.branchFromMessage,
	).withOptimisticUpdate((localStore, args) => {
		const { clientId, originalThreadId } = args;
		if (!clientId) return; // Only do optimistic updates with clientId

		const now = Date.now();

		// Get the original thread to copy its title
		const originalThread = localStore.getQuery(api.threads.get, {
			threadId: originalThreadId,
		});

		// CRITICAL: Use a deterministic temp thread ID that can be referenced later
		// This matches the pattern used in useChat.ts for createThreadAndSend
		const tempThreadId = crypto.randomUUID() as Id<"threads">;

		// Create optimistic branched thread for immediate sidebar display
		const optimisticThread: Doc<"threads"> = {
			_id: tempThreadId,
			_creationTime: now,
			clientId,
			title: originalThread?.title || "",
			userId: "temp" as Id<"users">, // Temporary user ID
			createdAt: now,
			lastMessageAt: now,
			isGenerating: true, // Will show loading state
			branchedFrom: {
				threadId: originalThreadId,
				messageId: args.branchFromMessageId,
				timestamp: now,
			},
			usage: {
				totalInputTokens: 0,
				totalOutputTokens: 0,
				totalTokens: 0,
				totalReasoningTokens: 0,
				totalCachedInputTokens: 0,
				messageCount: 0,
				modelStats: {},
			},
		};

		// Get existing threads from the store
		const existingThreads = localStore.getQuery(api.threads.list, {}) || [];

		// Add the new branched thread at the beginning
		localStore.setQuery(api.threads.list, {}, [
			optimisticThread,
			...existingThreads,
		]);

		// CRITICAL: Update thread by clientId query for instant routing
		// This allows useChat hook to find the thread immediately
		localStore.setQuery(
			api.threads.getByClientId,
			{ clientId },
			optimisticThread,
		);

		// Optimistically copy messages from original thread up to branch point
		const originalMessages = localStore.getQuery(api.messages.list, {
			threadId: originalThreadId,
		});
		if (originalMessages) {
			// Find branch point message
			const branchPointIndex = originalMessages.findIndex(
				(msg) => msg._id === args.branchFromMessageId,
			);

			if (branchPointIndex !== -1) {
				// Find the user message that prompted the assistant response we're branching from
				// Note: originalMessages is in descending order (newest first)
				// So we search forward from the branch point to find the user message
				let lastUserMessageIndex = -1;
				for (let i = branchPointIndex; i < originalMessages.length; i++) {
					if (originalMessages[i].messageType === "user") {
						lastUserMessageIndex = i;
						break;
					}
				}

				// Copy messages to match backend behavior
				// Backend copies from oldest to user message (inclusive)
				// Frontend has newest first, so we copy from user message to oldest (end of array)
				const messagesToCopy =
					lastUserMessageIndex !== -1
						? originalMessages.slice(lastUserMessageIndex) // Copy from user message to end (includes all older messages)
						: originalMessages.slice(branchPointIndex); // Fallback: copy from branch point to end

				// Create optimistic copies with the SAME tempThreadId
				const optimisticMessages = messagesToCopy.map((msg) => ({
					...msg,
					_id: crypto.randomUUID() as Id<"messages">,
					threadId: tempThreadId, // Use the same tempThreadId as the thread
				}));

				// Create optimistic assistant message placeholder for the new response
				const optimisticAssistantMessage: Doc<"messages"> = {
					_id: crypto.randomUUID() as Id<"messages">,
					_creationTime: now + 1,
					threadId: tempThreadId,
					body: "", // Empty body for streaming
					messageType: "assistant",
					modelId: args.modelId,
					timestamp: now + 1,
					isStreaming: true,
					isComplete: false,
					streamId: `stream_${clientId}_${now}`,
					thinkingStartedAt: now,
				};

				// Combine all messages: existing ones + new assistant placeholder
				// Messages are in descending order (newest first)
				const allOptimisticMessages = [
					optimisticAssistantMessage, // New assistant message at the top
					...optimisticMessages, // All copied messages below
				];

				// CRITICAL: Set optimistic messages using the tempThreadId
				// This ensures useChat hook can find them immediately
				localStore.setQuery(
					api.messages.list,
					{ threadId: tempThreadId },
					allOptimisticMessages,
				);

				// CRITICAL: Also set messages by clientId for instant navigation
				// This allows useChat to find messages before the thread is created
				localStore.setQuery(
					api.messages.listByClientId,
					{ clientId },
					allOptimisticMessages,
				);
			}
		}
	});

	const handleFeedback = async (rating: "thumbs_up" | "thumbs_down") => {
		if (rating === "thumbs_down") {
			setShowFeedbackModal(true);
			return;
		}

		if (feedback?.rating === rating) {
			await removeFeedback({ messageId: message._id });
		} else {
			await submitFeedback({
				messageId: message._id,
				rating: "thumbs_up",
				comment: feedback?.comment,
				reasons: feedback?.reasons,
			});
		}
	};

	const handleCopy = () => {
		if (message.body) {
			copy(message.body);
		}
	};

	const handleBranch = async (modelId: ModelId) => {
		try {
			// 🚀 Generate client ID for instant navigation (like new chat)
			const clientId = nanoid();

			// Update URL immediately without navigation events
			// Using window.history.replaceState like Vercel's AI chatbot for smoothest UX
			window.history.replaceState({}, "", `/chat/${clientId}`);

			// Create branch in background - the useChat hook will handle optimistic updates
			await branchThread({
				originalThreadId: message.threadId,
				branchFromMessageId: message._id,
				modelId,
				clientId, // Pass clientId to backend
			});
		} catch (error) {
			console.error("Failed to create branch:", error);
			// TODO: Revert URL on error - could navigate back to original thread
		}
	};

	return (
		<>
			<div className={cn("flex items-center gap-1 h-8", className)}>
				<Button
					variant="ghost"
					size="icon"
					className={cn(
						"h-8 w-8 transition-colors",
						feedback?.rating === "thumbs_up" &&
							"text-green-600 hover:text-green-700",
					)}
					onClick={() => handleFeedback("thumbs_up")}
					aria-label="Like message"
				>
					<ThumbsUp className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className={cn(
						"h-8 w-8 transition-colors",
						feedback?.rating === "thumbs_down" &&
							"text-red-600 hover:text-red-700",
					)}
					onClick={() => handleFeedback("thumbs_down")}
					aria-label="Dislike message"
				>
					<ThumbsDown className="h-4 w-4" />
				</Button>
				{message.body && (
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
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

				<ModelBranchDropdown
					onBranch={handleBranch}
					onOpenChange={setIsDropdownOpen}
				/>

				{/* Metadata displayed inline on hover - positioned after branch */}
				<div className="opacity-0 group-hover/message:opacity-100 transition-opacity duration-200 flex items-center gap-2 text-xs text-muted-foreground ml-1">
					{/* Model name */}
					{modelName && <span>{modelName}</span>}

					{/* API Key badge */}
					{message.usedUserApiKey && (
						<Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
							<Key className="w-3 h-3 mr-1" />
							Your API Key
						</Badge>
					)}

					{/* Thinking duration */}
					{thinkingDuration && (
						<>
							{(modelName || message.usedUserApiKey) && <span>•</span>}
							<span className="font-mono">
								Thought for {formatDuration(thinkingDuration)}
							</span>
						</>
					)}

					{/* Usage chip */}
					{message.usage && (
						<>
							{(modelName || message.usedUserApiKey || thinkingDuration) && (
								<span>•</span>
							)}
							<MessageUsageChip usage={message.usage} />
						</>
					)}
				</div>
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
	);
}
