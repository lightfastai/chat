"use client";

import { useChat } from "@/hooks/use-chat";
import type { Preloaded } from "convex/react";
import { useEffect, useState } from "react";
import type { api } from "../../../convex/_generated/api";

interface ChatInterfaceV2TestProps {
	preloadedThreadById?: Preloaded<typeof api.threads.get>;
	preloadedThreadByClientId?: Preloaded<typeof api.threads.getByClientId>;
	preloadedMessages?: Preloaded<typeof api.messages.list>;
	preloadedUserSettings?: Preloaded<typeof api.userSettings.getUserSettings>;
}

export function ChatInterfaceV2Test({
	preloadedThreadById,
	preloadedThreadByClientId,
	preloadedMessages,
	preloadedUserSettings,
}: ChatInterfaceV2TestProps = {}) {
	const [testMessage, setTestMessage] = useState("");
	const [testResults, setTestResults] = useState<string[]>([]);

	// Use the v2 chat hook with Vercel AI SDK integration
	const {
		messages, // Convex messages for backward compatibility
		uiMessages, // UIMessages with streaming state
		currentThread,
		sendMessage,
		status,
		error,
		isNewChat,
		modelId,
		webSearchEnabled,
	} = useChat({
		preloadedThreadById,
		preloadedThreadByClientId,
		preloadedMessages,
		preloadedUserSettings,
	});

	// Add test result
	const addTestResult = (result: string) => {
		setTestResults((prev) => [
			...prev,
			`[${new Date().toISOString()}] ${result}`,
		]);
	};

	// Test status logging
	useEffect(() => {
		addTestResult(`Chat status: ${status}`);
		if (error) {
			addTestResult(`Error: ${error.message}`);
		}
	}, [status, error]);

	// Log message updates
	useEffect(() => {
		addTestResult(
			`Convex messages: ${messages.length}, UI messages: ${uiMessages.length}`,
		);
		if (uiMessages.length > 0) {
			const lastMessage = uiMessages[uiMessages.length - 1];
			addTestResult(
				`Last UI message: ${lastMessage.role} - ${
					lastMessage.parts?.[0]?.type === "text"
						? (lastMessage.parts[0] as any).text.slice(0, 50) + "..."
						: "non-text content"
				}`,
			);
		}
	}, [messages, uiMessages]);

	const handleTestSend = async () => {
		if (!testMessage.trim()) return;

		addTestResult(`Sending message: "${testMessage}"`);
		addTestResult(`Using model: ${modelId}, webSearch: ${webSearchEnabled}`);

		try {
			await sendMessage({
				message: testMessage,
				modelId,
			});
			addTestResult("Message sent successfully");
			setTestMessage("");
		} catch (error) {
			addTestResult(`Send error: ${error}`);
		}
	};

	return (
		<div className="p-4 space-y-4">
			<h2 className="text-xl font-bold">Vercel AI SDK v5 Integration Test</h2>

			<div className="space-y-2">
				<h3 className="font-semibold">Status</h3>
				<div className="text-sm space-y-1">
					<div>Thread: {currentThread?._id || "No thread"}</div>
					<div>Is New Chat: {isNewChat ? "Yes" : "No"}</div>
					<div>Stream Status: {status}</div>
					<div>Model: {modelId}</div>
					<div>Web Search: {webSearchEnabled ? "Enabled" : "Disabled"}</div>
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="font-semibold">Send Test Message</h3>
				<div className="flex gap-2">
					<input
						type="text"
						value={testMessage}
						onChange={(e) => setTestMessage(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleTestSend();
							}
						}}
						placeholder="Type a test message..."
						className="flex-1 px-3 py-2 border rounded-md"
					/>
					<button
						onClick={handleTestSend}
						disabled={!!status}
						className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
					>
						Send
					</button>
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="font-semibold">Convex Messages ({messages.length})</h3>
				<div className="max-h-40 overflow-y-auto border rounded p-2 text-sm space-y-1">
					{messages.map((msg) => (
						<div key={msg._id} className="border-b pb-1">
							<strong>{msg.messageType}:</strong> {msg.body.slice(0, 100)}...
						</div>
					))}
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="font-semibold">UI Messages ({uiMessages.length})</h3>
				<div className="max-h-40 overflow-y-auto border rounded p-2 text-sm space-y-1">
					{uiMessages.map((msg, idx) => (
						<div key={msg.id || idx} className="border-b pb-1">
							<strong>{msg.role}:</strong>{" "}
							{msg.parts?.map((part, partIdx) => (
								<span key={partIdx}>
									{part.type === "text"
										? (part as any).text.slice(0, 100) + "..."
										: `[${part.type}]`}
								</span>
							))}
						</div>
					))}
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="font-semibold">Test Results</h3>
				<div className="max-h-60 overflow-y-auto border rounded p-2 text-xs font-mono space-y-1">
					{testResults.map((result, idx) => (
						<div key={idx}>{result}</div>
					))}
				</div>
			</div>
		</div>
	);
}
