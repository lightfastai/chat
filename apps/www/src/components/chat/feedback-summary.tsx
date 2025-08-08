"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@lightfast/ui/components/ui/card";
import { useConvexAuth, useQuery } from "convex/react";
import { MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface FeedbackSummaryProps {
	threadId: Id<"threads">;
}

export function FeedbackSummary({ threadId }: FeedbackSummaryProps) {
	const { isAuthenticated } = useConvexAuth();
	const feedback = useQuery(api.feedback.getThreadFeedback, isAuthenticated ? { threadId } : "skip");

	if (!feedback || feedback.length === 0) {
		return null;
	}

	const positiveCount = feedback.filter((f) => f.rating === "thumbs_up").length;
	const negativeCount = feedback.filter(
		(f) => f.rating === "thumbs_down",
	).length;
	const withComments = feedback.filter((f) => f.comment).length;

	return (
		<Card className="mb-4">
			<CardHeader className="pb-3">
				<CardTitle className="text-sm font-medium">Feedback Summary</CardTitle>
				<CardDescription className="text-xs">
					Your ratings help improve AI responses
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-4 text-sm">
					<div className="flex items-center gap-1">
						<ThumbsUp className="h-3.5 w-3.5 text-green-600" />
						<span className="font-medium">{positiveCount}</span>
					</div>
					<div className="flex items-center gap-1">
						<ThumbsDown className="h-3.5 w-3.5 text-red-600" />
						<span className="font-medium">{negativeCount}</span>
					</div>
					{withComments > 0 && (
						<div className="flex items-center gap-1 text-muted-foreground">
							<MessageSquare className="h-3.5 w-3.5" />
							<span className="text-xs">{withComments} with comments</span>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
