import { useEffect, useRef } from "react"

type KeyboardShortcut = {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  callback: () => void
}

export function useKeyboardShortcut(shortcut: KeyboardShortcut) {
  const callbackRef = useRef(shortcut.callback)

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = shortcut.callback
  }, [shortcut.callback])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the key matches
      if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return

      // Check modifier keys
      const isCtrlOrCmd = shortcut.ctrlKey || shortcut.metaKey
      const ctrlOrCmdPressed = event.ctrlKey || event.metaKey

      if (isCtrlOrCmd && !ctrlOrCmdPressed) return
      if (shortcut.shiftKey && !event.shiftKey) return
      if (shortcut.altKey && !event.altKey) return

      // Don't trigger in input fields unless it's a global shortcut
      const target = event.target as HTMLElement
      const isInputField = ["INPUT", "TEXTAREA"].includes(target.tagName)
      if (isInputField && !isCtrlOrCmd) return

      event.preventDefault()
      callbackRef.current()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    shortcut.key,
    shortcut.ctrlKey,
    shortcut.metaKey,
    shortcut.shiftKey,
    shortcut.altKey,
  ])
}

// Helper to get OS-specific modifier key text
export function getModifierKey() {
  if (typeof window === "undefined") return "Ctrl"
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
  return isMac ? "⌘" : "Ctrl"
}
