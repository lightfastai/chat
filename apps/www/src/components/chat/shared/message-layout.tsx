import { cn } from "@lightfast/ui/lib/utils";
import type React from "react";

export interface MessageLayoutProps {
	avatar: React.ReactNode;
	content: React.ReactNode;
	timestamp?: React.ReactNode;
	actions?: React.ReactNode;
	messageType: "user" | "assistant" | "system";
	className?: string;
}

export function MessageLayout({
	content,
	timestamp,
	actions,
	messageType,
	className,
}: MessageLayoutProps) {
	const isAssistant = messageType === "assistant";
	const isSystem = messageType === "system";
	const isUser = messageType === "user";

	return (
		<div
			className={cn(
				"group/message",
				isAssistant ? "mt-12" : isSystem ? "mt-2" : "mt-4",
				className,
			)}
		>
			<div className={cn(
				"flex-1 relative",
				isUser && "border rounded-lg p-4 bg-muted/50"
			)}>
				{content}
				{timestamp && (
					<div className="text-xs text-muted-foreground mt-1">{timestamp}</div>
				)}
				{actions && (
					<div className="opacity-0 transition-opacity group-hover/message:opacity-100">
						{actions}
					</div>
				)}
			</div>
		</div>
	);
}
