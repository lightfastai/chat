"use client";

import { Button } from "@lightfast/ui/components/ui/button";
import { Checkbox } from "@lightfast/ui/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@lightfast/ui/components/ui/dialog";
import { Label } from "@lightfast/ui/components/ui/label";
import { Textarea } from "@lightfast/ui/components/ui/textarea";
import { useMutation } from "convex/react";
import React from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

const feedbackOptions = [
	{ value: "not_helpful", label: "Not helpful" },
	{ value: "inaccurate", label: "Incorrect information" },
	{ value: "unclear", label: "Instructions ignored" },
	{ value: "repetitive", label: "Being lazy" },
	{ value: "incomplete", label: "Don't like style" },
	{ value: "off_topic", label: "Bad recommendation" },
] as const;

type FeedbackReason = (typeof feedbackOptions)[number]["value"];

interface FeedbackModalProps {
	isOpen: boolean;
	onClose: () => void;
	messageId: Id<"messages">;
	existingFeedback?: Doc<"feedback"> | null;
}

export function FeedbackModal({
	isOpen,
	onClose,
	messageId,
	existingFeedback,
}: FeedbackModalProps) {
	const [comment, setComment] = React.useState("");
	const [selectedReasons, setSelectedReasons] = React.useState<
		FeedbackReason[]
	>([]);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	React.useEffect(() => {
		if (isOpen) {
			setComment(existingFeedback?.comment || "");
			setSelectedReasons(
				(existingFeedback?.reasons as FeedbackReason[] | undefined) || [],
			);
		}
	}, [isOpen, existingFeedback]);

	const submitFeedback = useMutation(api.feedback.submitFeedback);

	const handleReasonChange = (reason: FeedbackReason) => {
		setSelectedReasons((prev) =>
			prev.includes(reason)
				? prev.filter((r) => r !== reason)
				: [...prev, reason],
		);
	};

	const handleSubmit = async () => {
		setIsSubmitting(true);
		try {
			await submitFeedback({
				messageId,
				rating: "thumbs_down",
				comment: comment.trim() || undefined,
				reasons: selectedReasons,
			});
			onClose();
		} catch (error) {
			console.error("Error submitting feedback:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Give feedback</DialogTitle>
					<DialogDescription>
						Provide additional feedback on this message. Select all that apply.
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-2 gap-4 py-4">
					{feedbackOptions.map((option) => (
						<div key={option.value} className="flex items-center space-x-2">
							<Checkbox
								id={option.value}
								checked={selectedReasons.includes(option.value)}
								onCheckedChange={() => handleReasonChange(option.value)}
							/>
							<Label
								htmlFor={option.value}
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{option.label}
							</Label>
						</div>
					))}
				</div>

				<div className="space-y-2">
					<Label htmlFor="comment">How can we improve? (optional)</Label>
					<Textarea
						id="comment"
						placeholder="Your feedback..."
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						className="min-h-[100px]"
					/>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={
							isSubmitting ||
							(selectedReasons.length === 0 && comment.trim() === "")
						}
					>
						{isSubmitting ? "Submitting..." : "Submit"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
