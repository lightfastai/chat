"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { env } from "@/env";
import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import React, { useState, useCallback, useRef } from "react";

interface StreamingMessage {
	_id: Id<"messages">;
	body: string;
	isStreaming: boolean;
	isComplete: boolean;
	timestamp: number;
	messageType: "user" | "assistant" | "system";
	modelId?: string;
}

interface StreamChunk {
	type: "text-delta" | "tool-call" | "tool-result" | "completion" | "error";
	text?: string;
	messageId: Id<"messages">;
	streamId?: Id<"streams">;
	error?: string;
	timestamp: number;
	// Tool-related fields
	toolName?: string;
	toolCallId?: string;
	args?: unknown;
	result?: unknown;
}

interface UseHTTPStreamingOptions {
	threadId: Id<"threads">;
	modelId: string;
}

interface UseHTTPStreamingReturn {
	streamingMessage: StreamingMessage | null;
	isStreaming: boolean;
	error: string | null;
	sendMessage: (content: string) => Promise<void>;
	clearError: () => void;
}

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

								if (data.type === "text-delta" && data.text) {
									// Update streaming message with new text
									currentMessage = {
										...currentMessage,
										_id: data.messageId,
										body: currentMessage.body + data.text,
										timestamp: data.timestamp,
									};
									setStreamingMessage(currentMessage);
									console.log("🌊 HTTP Streaming: Received text chunk:", {
										chunkLength: data.text.length,
										totalLength: currentMessage.body.length,
										timestamp: new Date(data.timestamp).toISOString(),
									});
								} else if (data.type === "tool-call") {
									console.log("🔧 HTTP Streaming: Tool call:", {
										toolName: data.toolName,
										toolCallId: data.toolCallId,
									});
									// Tool calls are handled by the message parts system
								} else if (data.type === "tool-result") {
									console.log("📊 HTTP Streaming: Tool result:", {
										toolName: data.toolName,
										toolCallId: data.toolCallId,
									});
									// Tool results are handled by the message parts system
								} else if (data.type === "completion") {
									// Mark as complete
									currentMessage = {
										...currentMessage,
										_id: data.messageId,
										isStreaming: false,
										isComplete: true,
										timestamp: data.timestamp,
									};
									setStreamingMessage(currentMessage);
									setIsStreaming(false);
								} else if (data.type === "error") {
									// Handle streaming error
									setError(data.error || "Unknown streaming error");
									setIsStreaming(false);
									currentMessage = {
										...currentMessage,
										_id: data.messageId,
										isStreaming: false,
										isComplete: true,
										body: data.error || "Error occurred during streaming",
									};
									setStreamingMessage(currentMessage);
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
