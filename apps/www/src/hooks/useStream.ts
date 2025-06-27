"use client";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { env } from "@/env";
import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

interface UseStreamOptions {
	streamId: Id<"streams"> | undefined;
	messageId: Id<"messages"> | undefined;
	driven: boolean; // Is this the client that initiated the stream?
	onError?: (error: string) => void;
}

// Stream state type matching the streams table status field
interface StreamState {
	text: string;
	status: Doc<"streams">["status"];
	error?: string;
}

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

	// Query stream body from database
	// Only query if we have a valid Convex stream ID
	const isValidStreamId = streamId?.startsWith("k");
	const streamBody = useQuery(
		api.streams.getStreamBody,
		streamId && isValidStreamId ? { streamId } : "skip",
	);

	// Determine if we should use HTTP streaming
	const shouldUseHttp =
		driven && !!streamId && isValidStreamId && httpStatus !== "error";

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
							const data = JSON.parse(line) as {
								type: string;
								text?: string;
								error?: string;
							};

							if (data.type === "text-delta" && data.text) {
								setHttpText((prev) => prev + data.text);
							} else if (data.type === "completion") {
								setHttpStatus("done");
							} else if (data.type === "error") {
								throw new Error(data.error || "Stream error");
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
		if (driven && streamId && isValidStreamId) {
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

		// Otherwise use database
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
		isValidStreamId,
		httpStatus,
		httpText,
		httpError,
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
