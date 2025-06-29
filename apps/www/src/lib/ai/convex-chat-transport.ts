"use client";

import type { FetchFunction } from "@ai-sdk/provider-utils";
import type {
	ChatRequestOptions,
	ChatTransport,
	UIMessage,
	UIMessageStreamPart,
} from "ai";

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
		this.fetch = options.fetch || (globalThis.fetch as FetchFunction);
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
		const { chatId, messages, abortSignal, trigger, messageId, body } = options;

		// Transform the request to match Convex HTTP streaming format
		const convexBody = {
			threadId: chatId,
			modelId: body?.modelId || this.convexOptions?.modelId,
			messages: messages, // Send UIMessages directly
			options: {
				webSearchEnabled:
					body?.webSearchEnabled || this.convexOptions?.webSearchEnabled,
				useExistingMessage: messageId,
				trigger, // Pass through the trigger type
			},
		};

		const response = await this.fetch(this.streamUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(this.headers as Record<string, string>),
			},
			body: JSON.stringify(convexBody),
			signal: abortSignal,
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		if (!response.body) {
			throw new Error("Response body is null");
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
