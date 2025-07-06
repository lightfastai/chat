"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { getModelDisplayName } from "@lightfast/ai/providers";
import { memo, useState } from "react";
import { AttachmentPreview } from "./attachment-preview";
import { MessageActions } from "./message-actions";
import { MessageItem } from "./shared";

interface MessageDisplayProps {
	message: Doc<"messages">;
}

// Component to display individual messages with streaming support
export const MessageDisplay = memo(function MessageDisplay({
	message,
}: MessageDisplayProps) {
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
				showActions={true}
				isReadOnly={false}
				actions={actions}
				forceActionsVisible={isDropdownOpen}
			/>
			{/* Show attachments if present */}
			{message.attachments && message.attachments.length > 0 && (
				<AttachmentPreview attachmentIds={message.attachments} />
			)}
		</>
	);
});
