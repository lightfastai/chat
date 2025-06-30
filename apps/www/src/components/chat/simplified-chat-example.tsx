"use client";

import { getMessageText } from "@/hooks/use-messages";
import { useSimplifiedChat } from "@/hooks/use-simplified-chat";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

interface SimplifiedChatExampleProps {
	threadId?: Id<"threads"> | null;
	clientId?: string | null;
	className?: string;
}

/**
 * Example component demonstrating the new simplified chat architecture
 * 
 * Key benefits shown here:
 * 1. No complex useEffect synchronization
 * 2. Single source of truth (Convex)
 * 3. Real-time updates through subscriptions
 * 4. Simple, predictable state management
 * 5. Much less code for the same functionality
 */
export function SimplifiedChatExample({
	threadId,
	clientId,
	className,
}: SimplifiedChatExampleProps) {
	const [inputValue, setInputValue] = useState("");

	// Single hook provides everything we need - no complex state management!
	const {
		messages,
		thread,
		sendMessage,
		canSendMessage,
		isStreaming,
		streamingError,
		totalMessages,
	} = useSimplifiedChat({
		threadId,
		clientId,
		modelId: "gpt-4o-mini",
		webSearchEnabled: false,
	});

	const handleSendMessage = async () => {
		if (!inputValue.trim() || !canSendMessage) return;

		const text = inputValue;
		setInputValue(""); // Clear input immediately for better UX

		try {
			await sendMessage({ text });
		} catch (error) {
			console.error("Failed to send message:", error);
			// In a real app, you'd show an error toast here
			setInputValue(text); // Restore input on error
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	return (
		<div className={`flex flex-col h-full ${className}`}>
			{/* Header */}
			<div className="border-b p-4 bg-background/50">
				<h2 className="font-semibold">
					{thread?.title || "New Chat"}
				</h2>
				<p className="text-sm text-muted-foreground">
					{totalMessages} messages • Thread: {threadId || clientId || "new"}
				</p>
				{streamingError && (
					<p className="text-sm text-destructive mt-1">
						Error: {streamingError.message}
					</p>
				)}
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.length === 0 ? (
					<div className="text-center text-muted-foreground py-8">
						<p>No messages yet. Start a conversation!</p>
					</div>
				) : (
					messages.map((messageWithStatus) => {
						const { message, isStreaming: msgStreaming, isError } = messageWithStatus;
						const text = getMessageText(message);
						const isUser = message.messageType === "user";

						return (
							<div
								key={message._id}
								className={`flex ${isUser ? "justify-end" : "justify-start"}`}
							>
								<div
									className={`max-w-[80%] rounded-lg px-4 py-2 ${
										isUser
											? "bg-primary text-primary-foreground"
											: isError
											? "bg-destructive/10 text-destructive border border-destructive/20"
											: "bg-muted"
									}`}
								>
									<div className="flex items-center gap-2 mb-1">
										<span className="font-medium text-sm">
											{isUser ? "You" : "Assistant"}
										</span>
										{msgStreaming && (
											<Loader2 className="h-3 w-3 animate-spin" />
										)}
									</div>
									<div className="whitespace-pre-wrap">
										{text || (msgStreaming ? "Thinking..." : "No content")}
									</div>
									{/* Debug info */}
									{process.env.NODE_ENV === "development" && (
										<div className="text-xs opacity-50 mt-1">
											Status: {message.status} | Parts: {message.parts?.length || 0}
										</div>
									)}
								</div>
							</div>
						);
					})
				)}

				{/* Global streaming indicator */}
				{isStreaming && (
					<div className="flex justify-start">
						<div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="h-3 w-3 animate-spin" />
								Streaming response...
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Input */}
			<div className="border-t p-4 bg-background/50">
				<div className="flex gap-2">
					<input
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder="Type your message..."
						disabled={!canSendMessage}
						className="flex-1 px-3 py-2 border rounded-md"
					/>
					<button
						onClick={handleSendMessage}
						disabled={!canSendMessage || !inputValue.trim()}
						className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isStreaming ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Send className="h-4 w-4" />
						)}
					</button>
				</div>
				{!canSendMessage && (
					<p className="text-xs text-muted-foreground mt-1">
						Please wait for the current message to complete...
					</p>
				)}
			</div>
		</div>
	);
}

/**
 * Usage examples:
 * 
 * // New chat
 * <SimplifiedChatExample />
 * 
 * // Existing thread
 * <SimplifiedChatExample threadId="k123..." />
 * 
 * // Optimistic new chat with clientId
 * <SimplifiedChatExample clientId="abc123" />
 */