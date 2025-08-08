"use client";

import type { TimezoneData } from "@/lib/timezone-cookies";
import type { ModelId } from "@lightfast/ai/providers";
import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { LightfastUIMessageOptions } from "../../hooks/convertDbMessagesToUIMessages";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatInput } from "./chat-input";

interface SimpleChatStartProps {
	onSendMessage: (options: LightfastUIMessageOptions) => Promise<void> | void;
	dbMessages?: Doc<"messages">[] | undefined;
	preloadedUser?: Preloaded<typeof api.users.current>;
	defaultModel?: ModelId;
	serverTimezone?: TimezoneData | null;
	ipEstimate?: string;
	serverGreeting?: {
		greeting: string;
		timezone: string;
		source: "cookie" | "ip" | "fallback";
	};
}

export function SimpleChatStart({
	onSendMessage,
	dbMessages,
	preloadedUser,
	defaultModel,
	serverTimezone,
	ipEstimate,
	serverGreeting,
}: SimpleChatStartProps) {
	return (
		<div className="h-screen flex flex-col relative">
			<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
				<div className="w-full max-w-3xl px-4 pointer-events-auto">
					<ChatEmptyState
						preloadedUser={preloadedUser}
						serverTimezone={serverTimezone}
						ipEstimate={ipEstimate}
						serverGreeting={serverGreeting}
					/>
					<ChatInput
						onSendMessage={onSendMessage}
						placeholder="How can I help you today?"
						dbMessages={dbMessages}
						showDisclaimer={false}
						defaultModel={defaultModel}
					/>
				</div>
			</div>
		</div>
	);
}

