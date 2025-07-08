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
	const previousMessageCount = useRef(0);

	// Watch for new DB messages and append them
	useEffect(() => {
		if (!dbMessages || !virtuoso.current) return;

		const currentCount = dbMessages.length;

		if (currentCount > previousMessageCount.current) {
			const newMessages = dbMessages.slice(previousMessageCount.current);

			// Append new messages
			virtuoso.current.data.append(
				newMessages.map((msg) => {
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

		previousMessageCount.current = currentCount;
	}, [dbMessages, processedMessages]);

	// Handle streaming updates from uiMessages
	useEffect(() => {
		if (!virtuoso.current || !uiMessages.length) return;

		const lastUiMessage = uiMessages[uiMessages.length - 1];
		const streamingDbId = lastUiMessage?.metadata?.dbId;

		if (!streamingDbId) return;

		// Convert UI parts to DB parts
		const streamingParts: DbMessagePart[] = [];
		lastUiMessage.parts.forEach((part, index) => {
			const dbPart = convertUIPartToDbPart(part, Date.now() + index);
			if (dbPart) {
				streamingParts.push(dbPart);
			}
		});

		// Update the message with streaming content
		virtuoso.current.data.map((message) => {
			if (message._id === streamingDbId) {
				return {
					...message,
					parts: streamingParts,
				};
			}
			return message;
		}, "smooth");
	}, [uiMessages]);

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
