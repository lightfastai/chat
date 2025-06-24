"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@lightfast/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@lightfast/ui/components/ui/tooltip";
import { Share2 } from "lucide-react";
import { useState } from "react";
import { ShareDialog } from "./share-dialog";

interface ShareButtonProps {
	threadId?: Id<"threads">;
	hasContent?: boolean;
}

export function ShareButton({
	threadId,
	hasContent = false,
}: ShareButtonProps) {
	const [isOpen, setIsOpen] = useState(false);

	const isDisabled = !hasContent;
	const isLoading = hasContent && !threadId; // Has content but thread not ready yet

	const button = (
		<Button
			variant="ghost"
			size="sm"
			onClick={() => !isDisabled && threadId && setIsOpen(true)}
			disabled={isDisabled}
			className="gap-2"
		>
			<Share2 className="h-4 w-4" />
			<span className="hidden sm:inline">Share</span>
		</Button>
	);

	if (isDisabled) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent>Start a conversation to share this chat</TooltipContent>
			</Tooltip>
		);
	}

	if (isLoading) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent>Preparing chat for sharing...</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<>
			{button}
			<ShareDialog
				threadId={threadId!}
				open={isOpen}
				onOpenChange={setIsOpen}
			/>
		</>
	);
}
