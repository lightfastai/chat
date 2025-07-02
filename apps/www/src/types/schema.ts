import type { UIMessage as VercelUIMessage } from "ai";
import { z } from "zod";

// Zod enum for thread types including error state
export const ThreadTypeEnum = z.enum(["new", "existing", "error"]);
export type ThreadType = z.infer<typeof ThreadTypeEnum>;

// Zod discriminated union for thread context with error handling
export const ThreadContextSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("new"),
		clientId: z.string().min(1).describe("Generated clientId for new chats"),
	}),
	z.object({
		type: z.literal("existing"),
		clientId: z
			.string()
			.min(1)
			.describe("ClientId from URL for existing chats"),
	}),
	z.object({
		type: z.literal("error"),
	}),
]);

export type ThreadContext = z.infer<typeof ThreadContextSchema>;
export type NewThread = Extract<ThreadContext, { type: "new" }>;
export type ExistingThread = Extract<ThreadContext, { type: "existing" }>;
export type ErrorThread = Extract<ThreadContext, { type: "error" }>;
export type ValidThread = Extract<ThreadContext, { type: "new" | "existing" }>;

export type UIMessage = VercelUIMessage;
