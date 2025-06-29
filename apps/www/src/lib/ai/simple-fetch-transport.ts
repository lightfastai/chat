"use client";

import type {
	ChatRequestOptions,
	ChatTransport,
	UIMessage,
	UIMessageStreamPart,
} from "ai";
import { isClientId } from "@/lib/nanoid";

export interface SimpleFetchTransportOptions {
	streamUrl: string;
	authToken?: string | null;
	modelId?: string;
	webSearchEnabled?: boolean;
}

/**
 * Simple transport that uses fetch directly with the default SSE protocol
 */
export class SimpleFetchTransport implements ChatTransport<UIMessage> {
	private streamUrl: string;
	private authToken: string | null;
	private modelId?: string;
	private webSearchEnabled?: boolean;

	constructor(options: SimpleFetchTransportOptions) {
		this.streamUrl = options.streamUrl;
		this.authToken = options.authToken || null;
		this.modelId = options.modelId;
		this.webSearchEnabled = options.webSearchEnabled;
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
		const { chatId, messages, abortSignal, body } = options;

		console.log("[SimpleFetchTransport] sendMessages called:", {
			chatId,
			messagesCount: messages.length,
		});

		// Transform to Convex format
		const convexBody = {
			threadId: chatId === "new" || isClientId(chatId) ? null : chatId,
			clientId: isClientId(chatId) ? chatId : undefined,
			modelId: (body as any)?.modelId || this.modelId,
			messages: messages,
			options: {
				webSearchEnabled:
					(body as any)?.webSearchEnabled || this.webSearchEnabled,
				attachments: (body as any)?.attachments,
			},
		};

		console.log("[SimpleFetchTransport] Request body:", JSON.stringify(convexBody, null, 2));

		const response = await fetch(this.streamUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
			},
			body: JSON.stringify(convexBody),
			signal: abortSignal,
		});

		console.log("[SimpleFetchTransport] Response status:", response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("[SimpleFetchTransport] Response error:", errorText);
			throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
		}

		if (!response.body) {
			throw new Error("Response body is null");
		}

		// Return the raw response body stream
		// The Vercel AI SDK will handle parsing the SSE stream
		return response.body;
	}

	async reconnectToStream(
		options: { chatId: string } & ChatRequestOptions,
	): Promise<ReadableStream<UIMessageStreamPart> | null> {
		// Reconnection not supported in this simple transport
		return null;
	}
}