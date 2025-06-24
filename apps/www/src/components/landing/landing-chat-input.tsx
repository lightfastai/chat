"use client";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Button } from "@lightfast/ui/components/ui/button";
import { Textarea } from "@lightfast/ui/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

export function LandingChatInput() {
	const [showSignInDialog, setShowSignInDialog] = useState(false);
	const [message, setMessage] = useState("");

	const handleSubmit = () => {
		if (message.trim()) {
			setShowSignInDialog(true);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	const handleSendClick = () => {
		handleSubmit();
	};

	return (
		<>
			<div className="relative">
				<Textarea
					placeholder="Ask anything..."
					className="min-h-[120px] resize-none pr-16 text-lg transition-colors focus:border-primary bg-transparent dark:bg-input/10 focus:bg-transparent dark:focus:bg-input/10 hover:bg-transparent dark:hover:bg-input/10 disabled:bg-transparent dark:disabled:bg-input/10"
					rows={4}
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
				<Button
					size="icon"
					onClick={handleSendClick}
					className="absolute right-3 bottom-3"
					disabled={!message.trim()}
				>
					<ArrowUp className="w-5 h-5" />
				</Button>
			</div>

			<SignInDialog
				open={showSignInDialog}
				onOpenChange={setShowSignInDialog}
			/>
		</>
	);
}
