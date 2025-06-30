"use client";

import { getModelDisplayName } from "@/lib/ai";
import type { UIMessage } from "ai";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AttachmentPreview } from "./attachment-preview";
import { MessageActions } from "./message-actions";
import { MessageItem } from "./shared";

interface MessageDisplayProps {
	message: UIMessage;
	userName: string;
}

// Component to display individual messages with streaming support
export function MessageDisplay({ message }: MessageDisplayProps) {
	// Get current user for avatar display
	const currentUser = useQuery(api.users.current);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const isAI = message.role === "assistant";
	const metadata = (message.metadata as any) || {};

	// Model name for AI messages
	const modelName = isAI
		? metadata.modelId
			? getModelDisplayName(metadata.modelId)
			: metadata.model
				? getModelDisplayName(metadata.model)
				: "AI Assistant"
		: undefined;

	// Debug logging for model display issues
	if (isAI && process.env.NODE_ENV === "development") {
		console.log("MessageDisplay debug:", {
			messageId: message.id,
			modelId: metadata.modelId,
			model: metadata.model,
			modelName,
			isStreaming: metadata.isStreaming,
			usedUserApiKey: metadata.usedUserApiKey,
			hasThinkingContent: metadata.hasThinkingContent,
			isComplete: metadata.isComplete,
		});
	}

	// Calculate thinking duration
	const thinkingDuration =
		metadata.thinkingStartedAt && metadata.thinkingCompletedAt
			? metadata.thinkingCompletedAt - metadata.thinkingStartedAt
			: null;

	// Actions component
	const actions = (
		<MessageActions
			message={message}
			modelName={modelName}
			thinkingDuration={thinkingDuration}
			onDropdownStateChange={setIsDropdownOpen}
		/>
	);

	return (
		<>
			<MessageItem
				message={message}
				currentUser={currentUser || undefined}
				showActions={true}
				isReadOnly={false}
				modelName={modelName}
				isStreaming={!!metadata.isStreaming}
				isComplete={metadata.isComplete !== false}
				actions={actions}
				forceActionsVisible={isDropdownOpen}
			/>
			{/* Show attachments if present */}
			{metadata.attachments && metadata.attachments.length > 0 && (
				<AttachmentPreview attachmentIds={metadata.attachments} />
			)}
		</>
	);
}
