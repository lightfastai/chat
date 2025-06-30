"use client";

import { env } from "@/env";
import type { ModelId } from "@/lib/ai";
import { isClientId, nanoid } from "@/lib/nanoid";
import { useChat } from "@ai-sdk/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo } from "react";
import type { Id } from "../../convex/_generated/dataModel";

interface StreamingOptions {
	modelId?: ModelId;
	webSearchEnabled?: boolean;
	attachments?: Id<"files">[];
}

interface StreamingTransportResult {
	streamMessage: (params: {
		threadId?: Id<"threads"> | null;
		clientId?: string | null;
		text: string;
		options?: StreamingOptions;
	}) => Promise<void>;
	isStreaming: boolean;
	error: Error | null;
	stop: () => void;
}

/**
 * Streaming-only transport hook that uses Vercel AI SDK for streaming
 * but doesn't manage message state (Convex handles that)
 *
 * This provides:
 * - HTTP streaming transport to our Convex endpoint
 * - Streaming status management
 * - Error handling
 * - But NO message state management (that's handled by useMessages)
 */
export function useStreamingTransport(): StreamingTransportResult {
	const authToken = useAuthToken();

	// Construct Convex HTTP endpoint URL
	const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
	const streamUrl = useMemo(() => {
		let convexSiteUrl: string;
		if (convexUrl.includes(".cloud")) {
			convexSiteUrl = convexUrl.replace(/\.cloud.*$/, ".site");
		} else {
			const url = new URL(convexUrl);
			url.port = String(Number(url.port) + 1);
			convexSiteUrl = url.toString().replace(/\/$/, "");
		}
		return `${convexSiteUrl}/stream-chat`;
	}, [convexUrl]);

	// Create transport with request transformation
	const transport = useMemo(() => {
		if (!authToken) return undefined;

		return new DefaultChatTransport({
			api: streamUrl,
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
			prepareSendMessagesRequest: ({
				id,
				messages,
				body,
				headers,
				credentials,
				api,
				trigger,
			}) => {
				// Transform the request to match Convex HTTP streaming format
				const requestBody = body as any;
				
				// Use threadId and clientId from the request body (passed by streamMessage)
				// Fall back to parsing the ID if they're not provided
				let threadId = requestBody?.threadId;
				let clientId = requestBody?.clientId;
				
				// If not provided in body, try to parse from the ID
				if (!threadId && !clientId) {
					if (id === "new" || id === "streaming-transport") {
						// These are dummy IDs, can't determine thread/client
						threadId = null;
						clientId = undefined;
					} else if (isClientId(id)) {
						clientId = id;
						threadId = null;
					} else {
						threadId = id;
						clientId = undefined;
					}
				}
				
				const convexBody = {
					threadId,
					clientId,
					modelId: requestBody?.modelId,
					messages: messages, // Send UIMessages directly
					options: {
						webSearchEnabled: requestBody?.webSearchEnabled,
						attachments: requestBody?.attachments,
						trigger, // Pass through the trigger type
					},
				};

				return {
					api: api,
					headers: headers,
					body: convexBody,
					credentials: credentials,
				};
			},
		});
	}, [streamUrl, authToken]);

	// Use Vercel AI SDK purely for streaming transport, not state management
	const {
		sendMessage: vercelSendMessage,
		status,
		error,
		stop,
	} = useChat({
		// Use a dummy ID - we don't want the SDK managing message state
		id: "streaming-transport",
		transport,
		// Generate consistent IDs
		generateId: () => nanoid(),
		// No state management callbacks needed
	});

	// Stream message function that works with our Convex-first architecture
	const streamMessage = useCallback(
		async ({
			threadId,
			clientId,
			text,
			options = {},
		}: {
			threadId?: Id<"threads"> | null;
			clientId?: string | null;
			text: string;
			options?: StreamingOptions;
		}) => {
			if (!text.trim()) return;

			// Send the message through the streaming transport
			// This will trigger HTTP streaming to our Convex endpoint
			// The endpoint will handle saving to database and real-time updates
			await vercelSendMessage(
				{
					role: "user",
					parts: [{ type: "text", text }],
				},
				{
					body: {
						threadId,
						clientId,
						modelId: options.modelId,
						webSearchEnabled: options.webSearchEnabled,
						attachments: options.attachments,
					},
				},
			);
		},
		[vercelSendMessage],
	);

	return {
		streamMessage,
		isStreaming: status === "streaming",
		error: error || null,
		stop,
	};
}

// Note: useSimplifiedChat moved to separate file to avoid circular imports
