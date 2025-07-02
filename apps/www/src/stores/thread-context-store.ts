import type { ThreadContext } from "@/types/schema";
import { create } from "zustand";
import type { Id } from "../../convex/_generated/dataModel";

// Store state interface
interface ThreadContextState {
	threadContext: ThreadContext;
	threadId: Id<"threads"> | undefined;
}

// Store actions interface
interface ThreadContextActions {
	// Core action: transition from new to existing
	transitionToExisting: (clientId: string) => void;
	setThreadContext: (context: ThreadContext) => void;
	setThreadId: (threadId: Id<"threads">) => void;
}

// Combined store type
export type ThreadContextStore = ThreadContextState & ThreadContextActions;

// Initial state factory
export const initThreadContextState = (
	initialContext: ThreadContext,
): ThreadContextState => ({
	threadContext: initialContext,
	threadId: undefined,
});

// Store creation function
export const createThreadContextStore = (initState: ThreadContextState) =>
	create<ThreadContextStore>()((set, get) => ({
		// Initial state
		...initState,

		// Transition from new to existing thread
		transitionToExisting: (clientId: string) => {
			const currentContext = get().threadContext;

			// Only transition if we're currently in a "new" state with matching clientId
			if (
				currentContext.type === "new" &&
				currentContext.clientId === clientId
			) {
				set({
					threadContext: {
						type: "existing",
						clientId,
					},
				});
			}
		},

		// Set thread context directly
		setThreadContext: (context: ThreadContext) => {
			set({ threadContext: context });
		},

		// Set thread ID
		setThreadId: (threadId: Id<"threads">) => {
			set({ threadId });
		},
	}));
