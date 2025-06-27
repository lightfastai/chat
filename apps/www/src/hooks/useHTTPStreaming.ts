"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { env } from "@/env";
import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import type { Infer } from "convex/values";
import React, { useState, useCallback, useRef } from "react";
import type {
	httpStreamChunkValidator,
	streamingMessageValidator,
} from "../../convex/validators";

// Types from validators
type StreamingMessage = Infer<typeof streamingMessageValidator>;
type StreamChunk = Infer<typeof httpStreamChunkValidator>;

// Hook options - using Pick to get just what we need
type UseHTTPStreamingOptions = {
	threadId: Id<"threads">;
	modelId: string;
};

// Hook return type
type UseHTTPStreamingReturn = {
	streamingMessage: StreamingMessage | null;
	isStreaming: boolean;
	error: string | null;
	sendMessage: (content: string) => Promise<void>;
	clearError: () => void;
};

export function useHTTPStreaming({
	threadId,
	modelId,
}: UseHTTPStreamingOptions): UseHTTPStreamingReturn {
	const [streamingMessage, setStreamingMessage] =
		useState<StreamingMessage | null>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const token = useAuthToken();

	// Fallback to real-time messages for non-streaming content
	const messages = useQuery(
		api.messages.list,
		threadId && threadId !== "skip" ? { threadId } : "skip",
	);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!threadId || threadId === "skip") {
				console.error("Cannot send message without a valid thread ID");
				return;
			}

			console.log("🌊 HTTP Streaming: Starting stream for message:", content);

			try {
				setError(null);
				setIsStreaming(true);

				// Cancel any existing stream
				if (abortControllerRef.current) {
					abortControllerRef.current.abort();
				}

				// Create new abort controller
				abortControllerRef.current = new AbortController();

				// Get fresh messages from Convex for the full conversation context
				const conversationMessages = [
					...(messages || []).reverse().map((msg) => ({
						role: msg.messageType as "user" | "assistant" | "system",
						content: msg.body,
					})),
					{
						role: "user" as const,
						content,
					},
				];

				// Make HTTP streaming request to Convex HTTP endpoint
				const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;

				// Construct site URL following Convex Agent SDK pattern
				let convexSiteUrl: string;
				if (convexUrl.includes(".cloud")) {
					// Production: replace .cloud with .site
					convexSiteUrl = convexUrl.replace(/\.cloud.*$/, ".site");
				} else {
					// Local development: use port + 1
					const url = new URL(convexUrl);
					url.port = String(Number(url.port) + 1);
					convexSiteUrl = url.toString();
				}

				const streamUrl = `${convexSiteUrl}/stream-chat`;

				console.log("Convex URL:", convexUrl);
				console.log("Convex Site URL:", convexSiteUrl);
				console.log("Stream URL:", streamUrl);

				console.log("🌊 HTTP Streaming: Making request to:", streamUrl, {
					threadId,
					modelId,
					messageCount: conversationMessages.length,
				});

				// Get auth token from Convex auth
				const authToken = token;
				console.log("Auth token obtained:", !!authToken);

				const response = await fetch(streamUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(authToken && { Authorization: `Bearer ${authToken}` }),
					},
					body: JSON.stringify({
						threadId,
						modelId,
						messages: conversationMessages,
					}),
					signal: abortControllerRef.current.signal,
				}).catch((error) => {
					console.error("🚨 HTTP Streaming fetch error:", error);
					console.error("Failed URL:", streamUrl);
					console.error("Convex URL:", convexUrl);
					throw error;
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				if (!response.body) {
					throw new Error("No response body");
				}

				// Initialize streaming message
				let currentMessage: StreamingMessage = {
					_id: "temp_streaming" as Id<"messages">,
					body: "",
					isStreaming: true,
					isComplete: false,
					timestamp: Date.now(),
					messageType: "assistant",
					modelId,
				};

				setStreamingMessage(currentMessage);

				// Process streaming response
				const reader = response.body.getReader();
				const decoder = new TextDecoder();

				try {
					while (true) {
						const { done, value } = await reader.read();

						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						const lines = chunk.split("\n").filter((line) => line.trim());

						for (const line of lines) {
							try {
								const data: StreamChunk = JSON.parse(line);

								if (data.type === "content" && data.envelope) {
									const { envelope } = data;

									// Update message ID if not set
									if (
										!currentMessage._id ||
										currentMessage._id === "temp_streaming"
									) {
										currentMessage = {
											...currentMessage,
											_id: envelope.messageId,
										};
									}

									// Handle message parts
									if (envelope.part) {
										const part = envelope.part;
										if (part.type === "text") {
											currentMessage = {
												...currentMessage,
												body: currentMessage.body + part.text,
												timestamp: envelope.timestamp,
											};
											setStreamingMessage(currentMessage);
											console.log("🌊 HTTP Streaming: Received text chunk:", {
												chunkLength: part.text.length,
												totalLength: currentMessage.body.length,
												timestamp: new Date(envelope.timestamp).toISOString(),
											});
										} else if (part.type === "tool-call") {
											console.log("🔧 HTTP Streaming: Tool call:", {
												toolName: part.toolName,
												toolCallId: part.toolCallId,
												state: part.state,
											});
											// Tool calls are handled by the message parts system
										} else if (part.type === "reasoning") {
											console.log("🧠 HTTP Streaming: Reasoning:", {
												textLength: part.text.length,
											});
											// Reasoning parts could be displayed separately
										} else if (part.type === "error") {
											setError(part.errorMessage);
											setIsStreaming(false);
											currentMessage = {
												...currentMessage,
												isStreaming: false,
												isComplete: true,
												body: part.errorMessage,
											};
											setStreamingMessage(currentMessage);
										}
									}

									// Handle events
									if (envelope.event) {
										const event = envelope.event;
										if (event.type === "stream-start") {
											console.log("🚀 HTTP Streaming: Stream started");
										} else if (event.type === "stream-end") {
											console.log("✅ HTTP Streaming: Stream completed");
											currentMessage = {
												...currentMessage,
												isStreaming: false,
												isComplete: true,
												timestamp: envelope.timestamp,
											};
											setStreamingMessage(currentMessage);
											setIsStreaming(false);
										} else if (event.type === "stream-error") {
											console.error(
												"❌ HTTP Streaming: Stream error:",
												event.error,
											);
											setError(event.error);
											setIsStreaming(false);
											currentMessage = {
												...currentMessage,
												isStreaming: false,
												isComplete: true,
												body: event.error,
											};
											setStreamingMessage(currentMessage);
										}
									}
								} else if (data.type === "control") {
									console.log(
										"🎛️ HTTP Streaming: Control message:",
										data.action,
									);
									// Handle control messages (ping, abort, ack)
								}
							} catch (parseError) {
								console.warn(
									"Failed to parse streaming chunk:",
									line,
									parseError,
								);
							}
						}
					}
				} finally {
					reader.releaseLock();
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					// Stream was cancelled, don't set error
					return;
				}

				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";
				setError(errorMessage);
				setIsStreaming(false);
				console.error("HTTP streaming error:", err);
			}
		},
		[threadId, modelId, messages],
	);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Clean up on unmount
	React.useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	return {
		streamingMessage,
		isStreaming,
		error,
		sendMessage,
		clearError,
	};
}
