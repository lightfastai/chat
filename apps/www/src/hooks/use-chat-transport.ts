"use client";

import { createStreamUrl } from "@/lib/create-base-url";
import type { ChatTransport } from "ai";
import { DefaultChatTransport } from "ai";
import { useMemo } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type { UIMessage } from "../types/schema";

interface UseChatTransportProps {
	/** Authentication token for Convex requests */
	authToken: string | null;
	/** Default AI model to use */
	defaultModel: string;
}

/**
 * Hook that creates and configures a DefaultChatTransport for Convex integration
 *
 * This hook encapsulates the complex transport configuration needed for Convex,
 * including authentication, request preparation, and Convex-specific body formatting.
 *
 * @returns Configured ChatTransport instance or undefined if not authenticated
 */
export function useChatTransport({
	authToken,
	defaultModel,
}: UseChatTransportProps): ChatTransport<UIMessage> | undefined {
	const transport = useMemo(() => {
		// Return undefined if not authenticated - this prevents transport creation
		if (!authToken) return undefined;

		return new DefaultChatTransport<UIMessage>({
			api: createStreamUrl(),
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
			prepareSendMessagesRequest: ({
				body,
				headers,
				messages,
				credentials,
				api,
			}) => {
				console.log("[useChatTransport] requestBody:", body);
				return {
					api,
					headers,
					body: {
						id: body?.id,
						threadClientId: body?.threadClientId,
						userMessageId: body?.userMessageId,
						messages: messages[messages.length - 1],
						options: {
							webSearchEnabled: (body?.webSearchEnabled as boolean) || false,
							attachments: body?.attachments as Id<"files">[] | undefined,
						},
					},
					credentials: credentials,
				};
			},
		});
	}, [authToken, defaultModel]);

	return transport;
}
