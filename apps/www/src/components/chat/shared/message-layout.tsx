import { cn } from "@lightfast/ui/lib/utils";
import type React from "react";
import type { DbMessageRole } from "../../../../convex/types";

export interface MessageLayoutProps {
	content: React.ReactNode;
	timestamp?: React.ReactNode;
	actions?: React.ReactNode;
	role?: DbMessageRole;
	forceActionsVisible?: boolean;
}

export function MessageLayout({
	content,
	timestamp,
	actions,
	role,
	forceActionsVisible = false,
}: MessageLayoutProps) {
	// @todo quick hack to handle system messages using !role due to optional role
	const isAssistant = role === "assistant" || !role;
	const isSystem = role === "system";
	const isUser = role === "user";

	return (
		<div
			className={cn(
				"group/message",
				isAssistant ? "mt-12" : isSystem ? "mt-2" : "mt-4",
				isUser && "flex justify-end",
			)}
		>
			<div
				className={cn(
					"relative",
					isUser
						? "max-w-[80%] border border-muted/30 rounded-xl px-4 py-1 bg-transparent dark:bg-input/30"
						: "flex-1",
				)}
			>
				{content}
				{timestamp && (
					<div className="text-xs text-muted-foreground mt-1">{timestamp}</div>
				)}
				{actions && (
					<div
						className={cn(
							"mt-3 transition-opacity",
							forceActionsVisible
								? "opacity-100"
								: "opacity-0 group-hover/message:opacity-100",
						)}
					>
						{actions}
					</div>
				)}
			</div>
		</div>
	);
}
