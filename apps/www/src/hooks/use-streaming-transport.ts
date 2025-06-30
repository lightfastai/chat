"use client";

import { env } from "@/env";
import type { ModelId } from "@/lib/ai";
import { createStreamUrl } from "@/lib/create-base-url";
import { nanoid } from "@/lib/nanoid";
import { useChat as useVercelChat } from "@ai-sdk/react";
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

	// Construct Convex HTTP endpoint URL using utility
	const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
	const streamUrl = createStreamUrl(convexUrl);

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
				const requestBody = body as Record<string, unknown>;

				// Use threadId and clientId from the request body (passed by streamMessage)
				// Since all URIs are clientIds now, we don't need to check isClientId
				let threadId = requestBody?.threadId;
				let clientId = requestBody?.clientId;

				// If not provided in body, use the ID as clientId
				if (!threadId && !clientId) {
					if (id === "new" || id === "streaming-transport") {
						// These are dummy IDs, can't determine thread/client
						threadId = null;
						clientId = undefined;
					} else {
						// All URIs are clientIds now
						clientId = id;
						threadId = null;
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
	}, [authToken]);

	// Use Vercel AI SDK purely for streaming transport, not state management
	const {
		sendMessage: vercelSendMessage,
		status,
		error,
		stop,
	} = useVercelChat({
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
