"use client";

import {
  VirtuosoMessageList,
  VirtuosoMessageListLicense,
  type VirtuosoMessageListMethods,
  type VirtuosoMessageListProps,
} from "@virtuoso.dev/message-list";
import { useEffect, useMemo, useRef } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { DbMessage, DbMessagePart } from "../../../convex/types";
import type { LightfastUIMessage } from "../../hooks/convertDbMessagesToUIMessages";
import { convertUIPartToDbPart } from "../../hooks/convertDbMessagesToUIMessages";
import { useProcessedMessages } from "../../hooks/use-processed-messages";
import { MessageDisplay } from "./message-display";

interface ChatMessagesProps {
	dbMessages: Doc<"messages">[] | null | undefined;
	uiMessages: LightfastUIMessage[];
}

// Memoized component to prevent unnecessary re-renders during streaming
const ItemContent: VirtuosoMessageListProps<DbMessage, null>["ItemContent"] = ({
	data,
}) => {
	return (
		<div className="px-2 md:px-4">
			<div className="max-w-3xl mx-auto pb-4 sm:pb-6">
				<MessageDisplay message={data} />
			</div>
		</div>
	);
};

// Memoized compute key function for stable message identification
const computeItemKey = ({ data }: { data: DbMessage }) => data._id;

/**
 * VirtuosoMessageList integration with three-phase message handling:
 *
 * 1. IMMEDIATE DB MESSAGE APPEND: New DB messages appear instantly via virtuoso.data.append()
 * 2. STREAMING OVERLAY: Live streaming content overlaid via virtuoso.data.map()
 * 3. SEAMLESS REPLACEMENT: Final processed message via virtuoso.data.map() when streaming completes
 *
 * Key integration patterns:
 * - virtuoso.data.append(newMessages, scrollBehavior) for new DB messages
 * - virtuoso.data.map(mapper, "smooth") for live streaming updates
 * - virtuoso.data.map(mapper, "auto") for final replacement with merged parts
 * - Smart scroll behavior: smooth when user is at bottom, auto otherwise
 * - Efficient caching via useProcessedMessages and useStreamingMessageParts
 *
 * This ensures optimal UX with immediate message visibility, fast streaming updates,
 * and efficient final state with merged consecutive text/reasoning parts.
 */
export function ChatMessagesVirtuoso({
	dbMessages,
	uiMessages,
}: ChatMessagesProps) {
	const virtuoso = useRef<VirtuosoMessageListMethods<DbMessage>>(null);

	// Use the custom hook for efficient message processing
	const processedMessages = useProcessedMessages(dbMessages);

	// Track previous message count for detecting new messages
	const previousMessageCount = useRef(0);
	const currentStreamingId = useRef<string | null>(null);
	const isInitialized = useRef(false);

	// Effect: Handle initial load and new DB messages with virtuoso.data.append()
	useEffect(() => {
		if (!dbMessages || !virtuoso.current) return;

		const currentCount = dbMessages.length;

		// Initial load: populate all existing messages
		if (!isInitialized.current && currentCount > 0) {
			const allDisplayMessages = dbMessages.map((dbMessage) => {
				const processedMessage = processedMessages.get(dbMessage._id);
				return processedMessage || dbMessage;
			});

			// Replace initial empty data with all messages
			virtuoso.current.data.append(allDisplayMessages, () => ({
				index: "LAST",
				align: "end",
				behavior: "auto",
			}));

			isInitialized.current = true;
			previousMessageCount.current = currentCount;
			return;
		}

		// 1. IMMEDIATE DB MESSAGE APPEND: New messages detected
		if (currentCount > previousMessageCount.current) {
			const newMessages = dbMessages.slice(previousMessageCount.current);

			// Convert new messages to display format
			const newDisplayMessages = newMessages.map((dbMessage) => {
				const processedMessage = processedMessages.get(dbMessage._id);
				return processedMessage || dbMessage;
			});

			// Append new messages with smooth scroll behavior
			virtuoso.current.data.append(
				newDisplayMessages,
				({ scrollInProgress, atBottom }) => ({
					index: "LAST",
					align: "start",
					behavior: atBottom || scrollInProgress ? "smooth" : "auto",
				}),
			);
		}

		previousMessageCount.current = currentCount;
	}, [dbMessages, processedMessages]);

	// Effect: Handle streaming content updates directly from uiMessages
	useEffect(() => {
		if (!virtuoso.current || !dbMessages || uiMessages.length === 0) {
			// Clear streaming tracking when no active streaming
			currentStreamingId.current = null;
			return;
		}

		// Find streaming UI message that matches a DB message
		const lastUiMessage = uiMessages[uiMessages.length - 1];
		const streamingDbId = lastUiMessage?.metadata?.dbId;

		if (!streamingDbId) {
			currentStreamingId.current = null;
			return;
		}

		// Check if this message is actually streaming in the DB
		const dbMessage = dbMessages.find((msg) => msg._id === streamingDbId);
		if (!dbMessage || dbMessage.status !== "streaming") {
			currentStreamingId.current = null;
			return;
		}

		// Convert UI parts to DB parts for the streaming message
		const streamingParts: DbMessagePart[] = [];
		lastUiMessage.parts.forEach((part, index) => {
			const dbPart = convertUIPartToDbPart(part, Date.now() + index);
			if (dbPart) {
				streamingParts.push(dbPart);
			}
		});

		// 2. STREAMING OVERLAY: Update existing message with live streaming content
		virtuoso.current.data.map((message) => {
			return message._id === streamingDbId
				? {
						...message,
						parts: streamingParts, // Live streaming content from UI
					}
				: message;
		}, "smooth");

		currentStreamingId.current = streamingDbId;
	}, [dbMessages, uiMessages]);

	// Effect: Handle streaming completion with seamless replacement
	useEffect(() => {
		if (!virtuoso.current || !currentStreamingId.current) return;

		// 3. SEAMLESS REPLACEMENT: When streaming completes, replace with processed message
		const streamingId = currentStreamingId.current;
		const dbMessage = dbMessages?.find((msg) => msg._id === streamingId);

		if (dbMessage && dbMessage.status !== "streaming") {
			// Streaming completed - replace with processed message
			const processedMessage = processedMessages.get(streamingId);

			if (processedMessage) {
				virtuoso.current.data.map((message) => {
					return message._id === streamingId ? processedMessage : message;
				}, "auto"); // No animation for final replacement
			}

			currentStreamingId.current = null;
		}
	}, [dbMessages, processedMessages]);

	// Initial data for VirtuosoMessageList (empty on first load to use imperative methods)
	const initialMessages: DbMessage[] = useMemo(() => {
		// Always start empty - all updates go through imperative virtuoso.data methods
		return [];
	}, []); // Empty dependency array - only run once on mount

	// Handle empty state
	if (!dbMessages || dbMessages.length === 0) {
		return <div className="flex-1 min-h-0" />;
	}

	return (
		<div className="flex-1 min-h-0 flex flex-col">
			<VirtuosoMessageListLicense licenseKey="">
				<VirtuosoMessageList<DbMessage, null>
					ref={virtuoso}
					style={{ flex: 1 }}
					computeItemKey={computeItemKey}
					ItemContent={ItemContent}
					initialData={initialMessages}
					initialLocation={{
						index: "LAST",
						align: "end",
						behavior: "auto",
					}}
					increaseViewportBy={500}
				/>
			</VirtuosoMessageListLicense>
		</div>
	);
}
