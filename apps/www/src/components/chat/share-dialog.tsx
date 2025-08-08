"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@lightfast/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@lightfast/ui/components/ui/dialog";
import { Input } from "@lightfast/ui/components/ui/input";
import { Label } from "@lightfast/ui/components/ui/label";
import { Switch } from "@lightfast/ui/components/ui/switch";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Check, Copy, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ShareDialogProps {
	threadId: Id<"threads">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ShareDialog({
	threadId,
	open,
	onOpenChange,
}: ShareDialogProps) {
	const [copied, setCopied] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [settings, setSettings] = useState({
		showThinking: false,
	});

	const { isAuthenticated } = useConvexAuth();

	// Check if this is an optimistic thread ID (not a real Convex ID)
	const isOptimisticThreadId = !threadId.startsWith("k");

	const shareInfo = useQuery(
		api.share.getThreadShareInfo,
		isOptimisticThreadId || !isAuthenticated ? "skip" : { threadId },
	);

	const shareThread = useMutation(api.share.shareThread);
	const unshareThread = useMutation(api.share.unshareThread);
	const updateShareSettings = useMutation(api.share.updateShareSettings);

	useEffect(() => {
		if (shareInfo?.shareSettings) {
			setSettings({
				showThinking: shareInfo.shareSettings.showThinking || false,
			});
		}
	}, [shareInfo]);

	const shareUrl = shareInfo?.shareId
		? `${window.location.origin}/share/${shareInfo.shareId}`
		: "";

	const handleShare = async () => {
		if (isLoading || isOptimisticThreadId) return; // Prevent double-clicking or optimistic IDs

		try {
			setIsLoading(true);
			await shareThread({
				threadId,
				settings,
			});

			toast.success("Chat shared", {
				description: "Anyone with the link can now view this chat.",
			});
		} catch (error) {
			toast.error("Failed to share", {
				description: "There was an error sharing your chat. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleUnshare = async () => {
		if (isLoading || isOptimisticThreadId) return; // Prevent double-clicking or optimistic IDs

		try {
			setIsLoading(true);
			await unshareThread({
				threadId,
			});

			toast.success("Chat unshared", {
				description: "The share link has been disabled.",
			});
		} catch (error) {
			toast.error("Failed to unshare", {
				description:
					"There was an error disabling the share link. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);

			toast.success("Link copied", {
				description: "The share link has been copied to your clipboard.",
			});
		} catch (error) {
			toast.error("Failed to copy", {
				description: "Unable to copy the link. Please try again.",
			});
		}
	};

	const handleSettingChange = async (
		key: keyof typeof settings,
		value: boolean,
	) => {
		const newSettings = { ...settings, [key]: value };
		setSettings(newSettings);

		if (shareInfo?.isPublic && !isOptimisticThreadId) {
			try {
				await updateShareSettings({
					threadId,
					settings: newSettings,
				});
			} catch (error) {
				toast.error("Failed to update settings", {
					description: "There was an error updating share settings.",
				});
			}
		}
	};

	if (!shareInfo) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Globe className="h-5 w-5" />
						Share Chat
					</DialogTitle>
					<DialogDescription>
						{shareInfo.isPublic
							? "Your chat is currently shared. Anyone with the link can view it."
							: "Share this chat with others by generating a public link."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 ">
					{shareInfo.isPublic && (
						<>
							<div className="space-y-2">
								<Label htmlFor="share-link">Share link</Label>
								<div className="flex gap-2">
									<Input
										id="share-link"
										value={shareUrl}
										readOnly
										className="font-mono text-sm"
									/>
									<Button
										variant="outline"
										size="icon"
										onClick={handleCopyLink}
										className="shrink-0"
									>
										{copied ? (
											<Check className="h-4 w-4" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>

							<div className="space-y-3">
								<h4 className="text-sm font-medium">Share settings</h4>

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="show-thinking">Show thinking process</Label>
										<p className="text-xs text-muted-foreground">
											Display AI reasoning and thought process
										</p>
									</div>
									<Switch
										id="show-thinking"
										checked={settings.showThinking}
										onCheckedChange={(checked) =>
											handleSettingChange("showThinking", checked)
										}
									/>
								</div>
							</div>
						</>
					)}
				</div>

				<DialogFooter>
					{shareInfo.isPublic ? (
						<>
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Done
							</Button>
							<Button
								variant="destructive"
								onClick={handleUnshare}
								disabled={isLoading}
							>
								Stop sharing
							</Button>
						</>
					) : (
						<>
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button onClick={handleShare} disabled={isLoading}>
								<Globe className="h-4 w-4 mr-2" />
								Share chat
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
