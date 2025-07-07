"use client";

import { api } from "@/convex/_generated/api";
import { Alert, AlertDescription } from "@lightfast/ui/components/ui/alert";
import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MessageItem } from "./shared";

interface SharedChatViewProps {
	shareId: string;
}

export function SharedChatView({ shareId }: SharedChatViewProps) {
	const logAccess = useMutation(api.share.logShareAccess);
	const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);

	const sharedData = useQuery(
		api.share.getSharedThread,
		accessAllowed ? { shareId } : "skip",
	);

	// Log access attempt on component mount
	useEffect(() => {
		if (accessAllowed === null) {
			logAccess({ shareId })
				.then((result) => {
					setAccessAllowed(result.allowed);
				})
				.catch(() => {
					setAccessAllowed(false);
				});
		}
	}, [shareId, logAccess, accessAllowed]);

	// Show loading while checking access or loading data
	if (accessAllowed === null || (accessAllowed && sharedData === undefined)) {
		return (
			<div className="flex items-center justify-center h-screen">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Show error if access not allowed or data not found
	if (!accessAllowed || !sharedData) {
		return (
			<div className="flex flex-col items-center justify-center h-screen gap-4">
				<AlertCircle className="h-12 w-12 text-muted-foreground" />
				<h1 className="text-2xl font-semibold">Chat not found</h1>
				<p className="text-muted-foreground">
					This chat may have been deleted or the link has expired.
				</p>
			</div>
		);
	}

	const { thread, messages, owner } = sharedData;

	return (
		<div className="flex flex-col h-screen">
			{/* Simplified Header */}
			<header className="px-4 py-2">
				<h1 className="text-xs text-muted-foreground">{thread.title}</h1>
			</header>

			{/* Messages */}
			<ScrollArea className="flex-1">
				<div className="p-4 pb-16">
					<div className="space-y-6 max-w-3xl mx-auto">
						{/* Disclaimer */}
						<Alert className="mb-6">
							<Info className="h-4 w-4" />
							<AlertDescription className="text-xs">
								This is a copy of a chat between Lightfast and{" "}
								{owner?.name || "a user"}. Content may include unverified or
								unsafe content that do not represent the views of Lightfast.
								Shared snapshot may contain attachments and data not displayed
								here.
							</AlertDescription>
						</Alert>
						{messages.map((message) => {
							return (
								<MessageItem
									key={message._id}
									message={message}
									isReadOnly={true}
									showActions={false}
								/>
							);
						})}
					</div>
				</div>
			</ScrollArea>

			{/* Footer */}
			<footer className="border-t px-6 py-3">
				<p className="text-sm text-center text-muted-foreground">
					This is a read-only view of a shared conversation
				</p>
			</footer>
		</div>
	);
}
