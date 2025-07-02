"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { getModelDisplayName } from "@/lib/ai";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AttachmentPreview } from "./attachment-preview";
import { MessageActions } from "./message-actions";
import { MessageItem } from "./shared";

interface MessageDisplayProps {
	message: Doc<"messages">;
	status?: "ready" | "streaming" | "submitted" | "error";
	isLastAssistantMessage?: boolean;
}

// Component to display individual messages with streaming support
export function MessageDisplay({
	message,
	status,
	isLastAssistantMessage,
}: MessageDisplayProps) {
	// Get current user for avatar display
	const currentUser = useQuery(api.users.current);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const isAI = message.role === "assistant";

	// Model name for AI messages
	const modelName =
		isAI && message.modelId
			? getModelDisplayName(message.modelId)
			: "AI Assistant";

	// Actions component
	const actions = (
		<MessageActions
			message={message}
			modelName={modelName}
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
				actions={actions}
				forceActionsVisible={isDropdownOpen}
				status={status}
				isLastAssistantMessage={isLastAssistantMessage}
			/>
			{/* Show attachments if present */}
			{message.attachments && message.attachments.length > 0 && (
				<AttachmentPreview attachmentIds={message.attachments} />
			)}
		</>
	);
}
