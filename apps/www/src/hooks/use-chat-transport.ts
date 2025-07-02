"use client";

import type { ChatTransport, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useMemo } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { createStreamUrl } from "@/lib/create-base-url";
import type { ValidThread } from "../types/schema";

interface UseChatTransportProps {
	/** Authentication token for Convex requests */
	authToken: string | null;
	/** Resolved Convex thread ID (if exists) */
	resolvedThreadId?: string | null;
	/** Client-generated ID for the chat */
	threadContext: ValidThread;
	/** Default AI model to use */
	defaultModel: string;
}

interface ConvexChatRequestBody {
	threadId?: string | null;
	clientId: string;
	modelId: string;
	messages: unknown[];
	options: {
		webSearchEnabled: boolean;
		attachments?: Id<"files">[];
		trigger?: string;
	};
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
	resolvedThreadId,
	threadContext,
	defaultModel,
}: UseChatTransportProps): ChatTransport<UIMessage> | undefined {
	const transport = useMemo(() => {
		// Return undefined if not authenticated - this prevents transport creation
		if (!authToken) return undefined;

		return new DefaultChatTransport({
			api: createStreamUrl(),
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
			prepareSendMessagesRequest: ({
				messages,
				body,
				headers,
				credentials,
				api,
				trigger,
			}) => {
				const requestBody = body as Record<string, unknown>;

				// Transform request body to Convex format
				const convexBody: ConvexChatRequestBody = {
					threadId: (requestBody?.threadId as string) || resolvedThreadId,
					clientId: (requestBody?.clientId as string) || threadContext.clientId,
					modelId: (requestBody?.modelId as string) || defaultModel,
					messages: messages,
					options: {
						webSearchEnabled: (requestBody?.webSearchEnabled as boolean) || false,
						attachments: requestBody?.attachments as Id<"files">[] | undefined,
						trigger,
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
	}, [authToken, resolvedThreadId, threadContext.clientId, defaultModel]);

	return transport;
}
