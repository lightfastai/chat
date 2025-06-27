"use client";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { env } from "@/env";
import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import type { Infer } from "convex/values";
import { useEffect, useMemo, useRef, useState } from "react";
import type { httpStreamChunkValidator } from "../../convex/validators";

// Type from validator
type StreamChunk = Infer<typeof httpStreamChunkValidator>;

// Hook options type
type UseStreamOptions = {
	streamId: Id<"streams"> | undefined;
	messageId: Id<"messages"> | undefined;
	driven: boolean; // Is this the client that initiated the stream?
	onError?: (error: string) => void;
};

// Stream state type matching the streams table status field
type StreamState = {
	text: string;
	status: Doc<"streams">["status"];
	error?: string;
};

/**
 * React hook for persistent text streaming following the Convex pattern.
 *
 * - If `driven` is true and we have a streamId, this client will initiate HTTP streaming
 * - If `driven` is false, this client will just read from the database
 * - Automatically falls back to database on HTTP failure
 */
export function useStream({
	streamId,
	messageId,
	driven,
	onError,
}: UseStreamOptions): StreamState {
	const [httpText, setHttpText] = useState("");
	const [httpStatus, setHttpStatus] = useState<
		"idle" | "streaming" | "done" | "error"
	>("idle");
	const [httpError, setHttpError] = useState<string | null>(null);
	const streamStarted = useRef(false);
	const authToken = useAuthToken();

	// Query stream body from database - prefer new delta system if messageId available
	const streamingText = useQuery(
		api.streamDeltas.getStreamingText,
		messageId ? { messageId } : "skip",
	);

	// Fallback to old stream body for compatibility
	const streamBody = useQuery(
		api.streams.getStreamBody,
		streamId && !messageId ? { streamId } : "skip",
	);

	// Determine if we should use HTTP streaming
	const shouldUseHttp = driven && !!streamId && httpStatus !== "error";

	// Start HTTP streaming if we're the driven client
	useEffect(() => {
		if (!shouldUseHttp || streamStarted.current || !messageId) return;

		const startStreaming = async () => {
			try {
				streamStarted.current = true;
				setHttpStatus("streaming");

				// Construct stream URL
				const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
				let convexSiteUrl: string;
				if (convexUrl.includes(".cloud")) {
					convexSiteUrl = convexUrl.replace(/\.cloud.*$/, ".site");
				} else {
					const url = new URL(convexUrl);
					url.port = String(Number(url.port) + 1);
					convexSiteUrl = url.toString();
				}
				const streamUrl = `${convexSiteUrl}/stream-continue/${streamId}`;

				// Make streaming request
				const response = await fetch(streamUrl, {
					method: "GET",
					headers: {
						...(authToken && { Authorization: `Bearer ${authToken}` }),
					},
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				if (!response.body) {
					throw new Error("No response body");
				}

				// Process streaming response
				const reader = response.body.getReader();
				const decoder = new TextDecoder();

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					const lines = chunk.split("\n").filter((line) => line.trim());

					for (const line of lines) {
						try {
							const data = JSON.parse(line) as StreamChunk;

							if (data.type === "content" && data.envelope) {
								const { envelope } = data;

								// Handle message parts
								if (envelope.part) {
									const part = envelope.part;
									if (part.type === "text") {
										setHttpText((prev) => prev + part.text);
									} else if (part.type === "error") {
										throw new Error(part.errorMessage);
									}
								}

								// Handle events
								if (envelope.event) {
									const event = envelope.event;
									if (event.type === "stream-end") {
										setHttpStatus("done");
									} else if (event.type === "stream-error") {
										throw new Error(event.error);
									}
								}
							} else if (data.type === "control") {
								// Handle control messages if needed
								console.log("Control message:", data.action);
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

				setHttpStatus("done");
			} catch (error) {
				console.error("HTTP streaming error:", error);
				setHttpError(error instanceof Error ? error.message : "Unknown error");
				setHttpStatus("error");
				onError?.(error instanceof Error ? error.message : "Unknown error");
			}
		};

		startStreaming();
	}, [shouldUseHttp, streamId, messageId, authToken, onError]);

	// Combine HTTP and database state
	return useMemo(() => {
		// If we're using HTTP, use that
		if (driven && streamId) {
			// Check if we had an HTTP error
			if (httpStatus === "error") {
				// Fall through to database
			} else {
				return {
					text: httpText,
					status:
						httpStatus === "idle"
							? "pending"
							: httpStatus === "streaming"
								? "streaming"
								: "done",
					error: httpError || undefined,
				};
			}
		}

		// Otherwise use database - prefer new delta system
		if (streamingText) {
			return {
				text: streamingText.text,
				status: streamingText.status,
				error: streamingText.error,
			};
		}

		// Fallback to old stream body system
		if (!streamBody) {
			return {
				text: "",
				status: "pending",
			};
		}

		return {
			text: streamBody.text,
			status: streamBody.status,
		};
	}, [
		driven,
		streamId,
		httpStatus,
		httpText,
		httpError,
		streamingText,
		streamBody,
	]);
}

/**
 * Hook specifically for message streaming that handles the message<->stream relationship
 */
export function useMessageStream(
	messageId: Id<"messages"> | undefined,
	driven: boolean,
): StreamState {
	// Get the message to find its streamId
	const message = useQuery(
		api.messages.get,
		messageId ? { messageId } : "skip",
	);

	return useStream({
		streamId: message?.streamId as Id<"streams"> | undefined,
		messageId,
		driven,
	});
}
