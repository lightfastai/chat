"use client";

import { createStreamUrl } from "@/lib/create-base-url";
import type { ChatTransport } from "ai";
import { DefaultChatTransport } from "ai";
import { useMemo } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type { LightfastUIMessage } from "./convertDbMessagesToUIMessages";

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
	defaultModel: _defaultModel,
}: UseChatTransportProps): ChatTransport<LightfastUIMessage> | undefined {
	const transport = useMemo(() => {
		console.log(`[useChatTransport] - Stream URL ${createStreamUrl()}`);
		// Return undefined if not authenticated - this prevents transport creation
		if (!authToken) {
			console.log(
				"[useChatTransport] - authToken not found, transport not created.",
			);
			return;
		}
		console.log("[useChatTransport] - Found token!");
		// @todo storngly type the body field.
		return new DefaultChatTransport<LightfastUIMessage>({
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
				return {
					api,
					headers,
					body: {
						id: body?.id,
						threadClientId: body?.threadClientId,
						userMessageId: body?.userMessageId,
						messages: messages[messages.length - 1],
						options: {
							webSearchEnabled: body?.options?.webSearchEnabled as boolean,
							attachments: body?.options?.attachments as Id<"files">[],
						},
					},
					credentials: credentials,
				};
			},
		});
	}, [authToken]);

	return transport;
}
