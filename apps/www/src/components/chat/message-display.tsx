"use client";

import { getModelDisplayName } from "@/lib/ai";
import { uiMessageToDisplayMessage } from "@/lib/ai/message-converters";
import type { UIMessage } from "ai";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { AttachmentPreview } from "./attachment-preview";
import { MessageActions } from "./message-actions";
import { MessageItem } from "./shared";

type Message = Doc<"messages">;

interface MessageDisplayProps {
	message: Message | UIMessage;
	userName: string;
}

// Component to display individual messages with streaming support
export function MessageDisplay({ message }: MessageDisplayProps) {
	// Convert UIMessage to Convex-like format if needed
	const displayMessage: Message =
		"_id" in message ? message : uiMessageToDisplayMessage(message);
	// Get current user for avatar display
	const currentUser = useQuery(api.users.current);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const isAI = displayMessage.messageType === "assistant";

	// Model name for AI messages
	const modelName = isAI
		? displayMessage.modelId
			? getModelDisplayName(displayMessage.modelId)
			: displayMessage.model
				? getModelDisplayName(displayMessage.model)
				: "AI Assistant"
		: undefined;

	// Debug logging for model display issues
	if (isAI && process.env.NODE_ENV === "development") {
		console.log("MessageDisplay debug:", {
			messageId: displayMessage._id,
			modelId: displayMessage.modelId,
			model: displayMessage.model,
			modelName,
			isStreaming: displayMessage.isStreaming,
			usedUserApiKey: displayMessage.usedUserApiKey,
			hasThinkingContent: displayMessage.hasThinkingContent,
			isComplete: displayMessage.isComplete,
		});
	}

	// Calculate thinking duration
	const thinkingDuration =
		displayMessage.thinkingStartedAt && displayMessage.thinkingCompletedAt
			? displayMessage.thinkingCompletedAt - displayMessage.thinkingStartedAt
			: null;

	// Actions component
	const actions = (
		<MessageActions
			message={displayMessage}
			modelName={modelName}
			thinkingDuration={thinkingDuration}
			onDropdownStateChange={setIsDropdownOpen}
		/>
	);

	return (
		<>
			<MessageItem
				message={displayMessage}
				currentUser={currentUser || undefined}
				showActions={true}
				isReadOnly={false}
				modelName={modelName}
				streamingText={displayMessage.body}
				isStreaming={!!displayMessage.isStreaming}
				isComplete={displayMessage.isComplete !== false}
				actions={actions}
				forceActionsVisible={isDropdownOpen}
			/>
			{/* Show attachments if present */}
			{displayMessage.attachments && displayMessage.attachments.length > 0 && (
				<AttachmentPreview attachmentIds={displayMessage.attachments} />
			)}
		</>
	);
}
