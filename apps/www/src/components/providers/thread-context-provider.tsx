"use client";

import type { ThreadContext } from "@/types/schema";
import { usePathname } from "next/navigation";
import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useRef,
} from "react";
import { useStore } from "zustand";
import {
	type ThreadContextStore,
	createThreadContextStore,
	initThreadContextState,
} from "../../stores/thread-context-store";

// Store API type
export type ThreadContextStoreApi = ReturnType<typeof createThreadContextStore>;

// Context for the store
export const ThreadContextStoreContext = createContext<
	ThreadContextStoreApi | undefined
>(undefined);

// Provider props
export interface ThreadContextStoreProviderProps {
	children: ReactNode;
	initialContext: ThreadContext;
}

// Provider component
export const ThreadContextStoreProvider = ({
	children,
	initialContext,
}: ThreadContextStoreProviderProps) => {
	const pathname = usePathname();
	const storeRef = useRef<ThreadContextStoreApi>(
		createThreadContextStore(initThreadContextState(initialContext)),
	);

	if (!storeRef.current) {
		const initialState = initThreadContextState(initialContext);
		storeRef.current = createThreadContextStore(initialState);
	}

	// Immediately sync on render if we're on /chat with new context
	// This prevents flash of old content before useEffect runs
	if (
		pathname === "/chat" &&
		initialContext.type === "new" &&
		storeRef.current
	) {
		const currentState = storeRef.current.getState();
		if (
			currentState.threadContext.type === "existing" ||
			currentState.threadContext.clientId !== initialContext.clientId
		) {
			storeRef.current.setState({
				threadContext: initialContext,
				threadId: undefined,
			});
		}
	}

	// Sync store with prop changes AND reset on navigation to /chat
	useEffect(() => {
		if (storeRef.current) {
			// If we're on /chat (new chat) and the initialContext is "new",
			// force reset the store to ensure clean state
			if (pathname === "/chat" && initialContext.type === "new") {
				// Reset threadId when going to new chat
				storeRef.current.setState({
					threadContext: initialContext,
					threadId: undefined,
				});
			} else {
				// Normal sync for other cases
				storeRef.current.getState().setThreadContext(initialContext);
			}
		}
	}, [initialContext, pathname]);

	return (
		<ThreadContextStoreContext.Provider value={storeRef.current}>
			{children}
		</ThreadContextStoreContext.Provider>
	);
};

// Hook to use the thread context store
export const useThreadContextStore = <T,>(
	selector: (store: ThreadContextStore) => T,
): T => {
	const threadContextStoreContext = useContext(ThreadContextStoreContext);

	if (!threadContextStoreContext) {
		throw new Error(
			"useThreadContextStore must be used within ThreadContextStoreProvider",
		);
	}

	return useStore(threadContextStoreContext, selector);
};

export const useSetThreadContext = () =>
	useThreadContextStore((state) => state.setThreadContext);
