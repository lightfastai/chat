"use client";

import type { ThreadContext } from "@/types/schema";
import { type ReactNode, createContext, useContext, useRef } from "react";
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
	const storeRef = useRef<ThreadContextStoreApi>(
		createThreadContextStore(initThreadContextState(initialContext)),
	);

	if (!storeRef.current) {
		const initialState = initThreadContextState(initialContext);
		storeRef.current = createThreadContextStore(initialState);
	}


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
