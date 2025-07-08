"use client";

import {
  VirtuosoMessageList,
  VirtuosoMessageListLicense,
  type VirtuosoMessageListMethods,
  type VirtuosoMessageListProps,
} from "@virtuoso.dev/message-list";
import { useEffect, useRef } from "react";
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

const computeItemKey = ({ data }: { data: DbMessage }) => data._id;

export function ChatMessagesVirtuoso({
	dbMessages,
	uiMessages,
}: ChatMessagesProps) {
	const virtuoso = useRef<VirtuosoMessageListMethods<DbMessage>>(null);
	const processedMessages = useProcessedMessages(dbMessages);
	const appendedMessageIds = useRef<Set<string>>(new Set());

	// Watch for new DB messages and append them
	useEffect(() => {
		if (!dbMessages || !virtuoso.current) return;

		// Find messages that haven't been appended yet
		const messagesToAppend = dbMessages.filter(
			(msg) => !appendedMessageIds.current.has(msg._id),
		);

		if (messagesToAppend.length > 0) {
			console.log(`Appending ${messagesToAppend.length} new messages`);

			// Append new messages
			virtuoso.current.data.append(
				messagesToAppend.map((msg) => {
					// Mark as appended
					appendedMessageIds.current.add(msg._id);

					// Use processed version for completed messages
					if (msg.status !== "streaming") {
						return processedMessages.get(msg._id) || msg;
					}
					return msg;
				}),
				({ scrollInProgress, atBottom }) => ({
					index: "LAST",
					align: "start",
					behavior: atBottom || scrollInProgress ? "smooth" : "auto",
				}),
			);
		}
	}, [dbMessages, processedMessages]);

	// Handle streaming updates from uiMessages
	useEffect(() => {
		if (!virtuoso.current || !uiMessages.length) return;

		const lastUiMessage = uiMessages[uiMessages.length - 1];
		const streamingDbId = lastUiMessage?.metadata?.dbId;

		if (!streamingDbId) return;

		// Check if this message has been appended to the list
		if (!appendedMessageIds.current.has(streamingDbId)) {
			console.log(
				`Streaming message ${streamingDbId} not in list yet, skipping update`,
			);
			return;
		}

		// Convert UI parts to DB parts
		const streamingParts: DbMessagePart[] = [];
		lastUiMessage.parts.forEach((part, index) => {
			const dbPart = convertUIPartToDbPart(part, Date.now() + index);
			if (dbPart) {
				streamingParts.push(dbPart);
			}
		});

		console.log(
			`Updating streaming message ${streamingDbId} with ${streamingParts.length} parts`,
		);

		// Update the message with streaming content
		let updated = false;
		virtuoso.current.data.map((message) => {
			if (message._id === streamingDbId) {
				updated = true;
				return {
					...message,
					parts: streamingParts,
				};
			}
			return message;
		}, "smooth");

		if (!updated) {
			console.warn(
				`Failed to update streaming message ${streamingDbId} - not found in list`,
			);
		}
	}, [uiMessages]);

	// Clean up tracking when messages are removed
	useEffect(() => {
		if (!dbMessages) return;

		const currentIds = new Set(dbMessages.map((msg) => msg._id));
		const toRemove: string[] = [];

		appendedMessageIds.current.forEach((id) => {
			if (!currentIds.has(id)) {
				toRemove.push(id);
			}
		});

		toRemove.forEach((id) => {
			appendedMessageIds.current.delete(id);
			console.log(`Removed ${id} from tracking`);
		});
	}, [dbMessages]);

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
					initialData={[]}
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
