"use client";

import type { FetchFunction } from "@ai-sdk/provider-utils";
import type {
	ChatRequestOptions,
	ChatTransport,
	UIMessage,
	UIMessageStreamPart,
} from "ai";
import { isClientId } from "@/lib/nanoid";

export interface ConvexChatTransportOptions {
	/**
	 * The Convex HTTP streaming endpoint URL
	 */
	streamUrl: string;

	/**
	 * Optional headers to include in requests
	 */
	headers?: HeadersInit;

	/**
	 * Optional fetch function to use for requests
	 */
	fetch?: FetchFunction;

	/**
	 * Additional Convex-specific options
	 */
	convexOptions?: {
		modelId?: string;
		webSearchEnabled?: boolean;
	};
}

/**
 * Custom transport that bridges Vercel AI SDK with Convex HTTP streaming
 * This transport handles the communication between the AI SDK useChat hook
 * and our Convex HTTP streaming endpoint.
 */
export class ConvexChatTransport implements ChatTransport<UIMessage> {
	private streamUrl: string;
	private headers: HeadersInit | undefined;
	private fetch: FetchFunction;
	private convexOptions: ConvexChatTransportOptions["convexOptions"];

	constructor(options: ConvexChatTransportOptions) {
		this.streamUrl = options.streamUrl;
		this.headers = options.headers;
		// Bind fetch to globalThis to maintain context
		this.fetch = options.fetch || ((...args) => globalThis.fetch(...args)) as FetchFunction;
		this.convexOptions = options.convexOptions;
	}

	async sendMessages(
		options: {
			chatId: string;
			messages: UIMessage[];
			abortSignal: AbortSignal | undefined;
		} & {
			trigger:
				| "submit-user-message"
				| "submit-tool-result"
				| "regenerate-assistant-message";
			messageId: string | undefined;
		} & ChatRequestOptions,
	): Promise<ReadableStream<UIMessageStreamPart>> {
		const { chatId, messages, abortSignal, trigger, body } = options;

		console.log("[ConvexChatTransport] sendMessages called:", {
			chatId,
			messagesCount: messages.length,
			trigger,
			body,
		});

		// Transform the request to match Convex HTTP streaming format
		const convexBody = {
			// For new chats or clientIds, send null threadId
			// If it's a clientId, send it separately so the backend can look up the thread
			threadId: chatId === "new" || isClientId(chatId) ? null : chatId,
			clientId: isClientId(chatId) ? chatId : undefined,
			modelId: (body as any)?.modelId || this.convexOptions?.modelId,
			messages: messages, // Send UIMessages directly
			options: {
				webSearchEnabled:
					(body as any)?.webSearchEnabled ||
					this.convexOptions?.webSearchEnabled,
				trigger, // Pass through the trigger type
				// Additional options that might be needed
				attachments: (body as any)?.attachments,
				// Remove useExistingMessage - we'll let Vercel AI SDK manage messages
			},
		};

		console.log("[ConvexChatTransport] Request body:", JSON.stringify(convexBody, null, 2));

		console.log("[ConvexChatTransport] Making fetch request to:", this.streamUrl);
		
		const response = await this.fetch(this.streamUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(this.headers as Record<string, string>),
			},
			body: JSON.stringify(convexBody),
			signal: abortSignal,
		});

		console.log("[ConvexChatTransport] Response status:", response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("[ConvexChatTransport] Response error:", errorText);
			throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
		}

		if (!response.body) {
			throw new Error("Response body is null");
		}

		// Check if we got a thread ID header for new chats
		const threadIdHeader = response.headers.get("X-Thread-Id");
		if (threadIdHeader && chatId === "new") {
			// The thread ID will be picked up by the streaming response
			// We could potentially update the URL here, but let's handle it in the component
		}

		// Return the stream directly - Convex already returns UIMessageStreamPart format
		return response.body as any as ReadableStream<UIMessageStreamPart>;
	}

	async reconnectToStream(
		options: {
			chatId: string;
		} & ChatRequestOptions,
	): Promise<ReadableStream<UIMessageStreamPart> | null> {
		// For reconnection, we need to pass the thread ID
		const response = await this.fetch(
			`${this.streamUrl}?threadId=${options.chatId}`,
			{
				method: "GET",
				headers: this.headers as Record<string, string>,
			},
		);

		if (!response.ok || !response.body) {
			return null;
		}

		// Return the stream directly
		return response.body as any as ReadableStream<UIMessageStreamPart>;
	}
}

// Re-export UIMessageStreamPart type for convenience
export type { UIMessageStreamPart } from "ai";
