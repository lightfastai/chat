"use client";

import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useRouter } from "next/navigation";
import { createContext, useContext, useRef } from "react";

interface KeyboardShortcutsContextValue {
	registerModelSelectorToggle: (callback: () => void) => void;
	unregisterModelSelectorToggle: () => void;
	registerChatInputFocus: (callback: () => void) => void;
	unregisterChatInputFocus: () => void;
}

const KeyboardShortcutsContext =
	createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcutsContext() {
	const context = useContext(KeyboardShortcutsContext);
	if (!context) {
		throw new Error(
			"useKeyboardShortcutsContext must be used within KeyboardShortcutsProvider",
		);
	}
	return context;
}

export function KeyboardShortcutsProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const modelSelectorToggleRef = useRef<(() => void) | null>(null);
	const chatInputFocusRef = useRef<(() => void) | null>(null);

	// Add keyboard shortcut for new chat (Cmd/Ctrl+Shift+O)
	useKeyboardShortcut({
		key: "o",
		ctrlKey: true,
		metaKey: true,
		shiftKey: true,
		callback: () => {
			router.push("/chat");
		},
	});

	// Note: Sidebar toggle (Cmd/Ctrl+B) is handled directly by SidebarProvider
	// to avoid circular event dispatch patterns that can fail after page reload

	// Add keyboard shortcut for model selector (Cmd/Ctrl+.)
	useKeyboardShortcut({
		key: ".",
		ctrlKey: true,
		metaKey: true,
		callback: () => {
			if (modelSelectorToggleRef.current) {
				modelSelectorToggleRef.current();
			}
		},
	});

	// Add keyboard shortcut for focusing chat input (/)
	useKeyboardShortcut({
		key: "/",
		callback: () => {
			if (chatInputFocusRef.current) {
				chatInputFocusRef.current();
			}
		},
	});

	const contextValue: KeyboardShortcutsContextValue = {
		registerModelSelectorToggle: (callback: () => void) => {
			modelSelectorToggleRef.current = callback;
		},
		unregisterModelSelectorToggle: () => {
			modelSelectorToggleRef.current = null;
		},
		registerChatInputFocus: (callback: () => void) => {
			chatInputFocusRef.current = callback;
		},
		unregisterChatInputFocus: () => {
			chatInputFocusRef.current = null;
		},
	};

	return (
		<KeyboardShortcutsContext.Provider value={contextValue}>
			{children}
		</KeyboardShortcutsContext.Provider>
	);
}
