"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTimeGreeting } from "@/hooks/use-time-greeting";
import type { TimezoneData } from "@/lib/timezone-cookies";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { ZapIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChatInput } from "./chat-input";
import { PromptSuggestions } from "./prompt-suggestions";

interface CenteredChatStartProps {
	onSendMessage: (
		message: string,
		modelId: string,
		attachments?: Id<"files">[],
		webSearchEnabled?: boolean,
	) => Promise<void> | void;
	disabled?: boolean;
	isLoading?: boolean;
	preloadedUser?: Preloaded<typeof api.users.current>;
	serverTimezone?: TimezoneData | null;
	ipEstimate?: string;
	serverGreeting?: {
		greeting: string;
		timezone: string;
		source: "cookie" | "ip" | "fallback";
	};
}

export function CenteredChatStart({
	onSendMessage,
	disabled = false,
	isLoading = false,
	preloadedUser,
	serverTimezone,
	ipEstimate,
	serverGreeting,
}: CenteredChatStartProps) {
	const { displayName, email } = useAuth();
	// Use server greeting if available to avoid client-side bounce
	const clientGreetingInfo = useTimeGreeting(serverTimezone, ipEstimate);
	const greeting = serverGreeting?.greeting || clientGreetingInfo.greeting;
	const source = serverGreeting?.source || clientGreetingInfo.source;
	const confidence = clientGreetingInfo.confidence;
	const [message, setMessage] = useState("");
	const chatInputRef = useRef<HTMLTextAreaElement>(null);

	// Use preloaded user data if available, otherwise fall back to regular auth hook
	const preloadedUserData = preloadedUser
		? (() => {
				try {
					return usePreloadedQuery(preloadedUser);
				} catch {
					return null; // Fallback to regular auth hook if preloaded data fails
				}
			})()
		: null;

	const userName =
		preloadedUserData?.email || preloadedUserData?.name || email || displayName;

	const handlePromptSelect = (prompt: string) => {
		// Populate the chat input with the selected prompt
		setMessage(prompt);
		// Focus the textarea after selecting a prompt
		chatInputRef.current?.focus();
	};

	return (
		<div className="flex flex-col h-full min-h-0 px-2 md:px-4">
			{/* Centered greeting and input */}
			<div className="flex flex-col items-center justify-center flex-1 min-h-0">
				<div className="w-full max-w-3xl mx-auto -mt-8 sm:-mt-16">
					<div className="text-center mb-6">
						<h1 className="text-2xl sm:text-4xl font-semibold text-foreground mb-2 flex items-center justify-center gap-2 sm:gap-4">
							<ZapIcon className="w-6 h-6 sm:w-8 sm:h-8 inline-block" />
							{greeting}, {userName}
						</h1>
						{/* Debug info in development */}
						{process.env.NODE_ENV === "development" && (
							<p className="text-xs text-muted-foreground mt-1">
								Timezone: {source} ({confidence})
							</p>
						)}
					</div>

					<div className="relative">
						<ChatInput
							ref={chatInputRef}
							onSendMessage={onSendMessage}
							placeholder="How can I help you today?"
							disabled={disabled}
							isLoading={isLoading}
							showDisclaimer={false}
							value={message}
							onChange={setMessage}
						/>

						{/* Prompt suggestions positioned absolutely below chat input */}
						<div className="absolute top-full left-0 right-0 z-10">
							<PromptSuggestions onSelectPrompt={handlePromptSelect} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
