"use client"

import {
  type GuestMessage,
  type GuestThread,
  guestStorage,
} from "@/lib/guest-storage"
import { usePathname, useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useState } from "react"

interface GuestChatContextValue {
  isGuest: boolean
  threads: GuestThread[]
  currentThread: GuestThread | null
  messages: GuestMessage[]
  canCreateThread: boolean
  canAddMessage: boolean
  messageCount: number
  threadCount: number
  createThread: (title: string, model: string) => string | null
  updateThreadTitle: (threadId: string, title: string) => void
  deleteThread: (threadId: string) => void
  addMessage: (
    message: Omit<GuestMessage, "id" | "threadId" | "createdAt">,
  ) => GuestMessage | null
  updateMessage: (messageId: string, updates: Partial<GuestMessage>) => void
  selectThread: (threadId: string) => void
  shouldShowUpgradePrompt: boolean
}

const GuestChatContext = createContext<GuestChatContextValue | null>(null)

export function useGuestChat() {
  const context = useContext(GuestChatContext)
  return context
}

interface GuestChatProviderProps {
  children: React.ReactNode
  isAuthenticated: boolean
}

export function GuestChatProvider({
  children,
  isAuthenticated,
}: GuestChatProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [threads, setThreads] = useState<GuestThread[]>([])
  const [currentThread, setCurrentThread] = useState<GuestThread | null>(null)
  const [messages, setMessages] = useState<GuestMessage[]>([])
  const [stats, setStats] = useState({ threadCount: 0, messageCount: 0 })

  // Extract thread ID from pathname
  const threadIdFromPath = pathname.match(/\/chat\/([^\/]+)/)?.[1]

  // Load data on mount and when authentication changes
  useEffect(() => {
    if (!isAuthenticated) {
      loadGuestData()
    }
  }, [isAuthenticated])

  // Handle thread selection from URL
  useEffect(() => {
    if (!isAuthenticated && threadIdFromPath && threadIdFromPath !== "new") {
      selectThread(threadIdFromPath)
    }
  }, [threadIdFromPath, isAuthenticated])

  const loadGuestData = () => {
    const loadedThreads = guestStorage.getThreads()
    const loadedStats = guestStorage.getStats()
    setThreads(loadedThreads)
    setStats({
      threadCount: loadedStats.threadCount,
      messageCount: loadedStats.messageCount,
    })

    // If we have a thread ID in the URL, load it
    if (threadIdFromPath && threadIdFromPath !== "new") {
      const thread = guestStorage.getThread(threadIdFromPath)
      if (thread) {
        setCurrentThread(thread)
        setMessages(guestStorage.getMessages(threadIdFromPath))
      }
    }
  }

  const createThread = (title: string, model: string): string | null => {
    const thread = guestStorage.createThread(title, model)
    if (thread) {
      loadGuestData()
      router.push(`/chat/${thread.id}`)
      return thread.id
    }
    return null
  }

  const updateThreadTitle = (threadId: string, title: string) => {
    guestStorage.updateThreadTitle(threadId, title)
    loadGuestData()
  }

  const deleteThread = (threadId: string) => {
    guestStorage.deleteThread(threadId)
    if (currentThread?.id === threadId) {
      setCurrentThread(null)
      setMessages([])
      router.push("/chat")
    }
    loadGuestData()
  }

  const addMessage = (
    message: Omit<GuestMessage, "id" | "threadId" | "createdAt">,
  ): GuestMessage | null => {
    if (!currentThread) return null

    const newMessage = guestStorage.addMessage(currentThread.id, message)
    if (newMessage) {
      setMessages(guestStorage.getMessages(currentThread.id))
      setStats(guestStorage.getStats())
    }
    return newMessage
  }

  const updateMessage = (messageId: string, updates: Partial<GuestMessage>) => {
    if (!currentThread) return

    guestStorage.updateMessage(currentThread.id, messageId, updates)
    setMessages(guestStorage.getMessages(currentThread.id))
  }

  const selectThread = (threadId: string) => {
    const thread = guestStorage.getThread(threadId)
    if (thread) {
      setCurrentThread(thread)
      setMessages(guestStorage.getMessages(threadId))
    }
  }

  const canCreateThread = guestStorage.canCreateThread()
  const canAddMessage = currentThread
    ? guestStorage.canAddMessage(currentThread.id)
    : false
  const shouldShowUpgradePrompt = stats.messageCount >= 10

  const value: GuestChatContextValue = {
    isGuest: !isAuthenticated,
    threads,
    currentThread,
    messages,
    canCreateThread,
    canAddMessage,
    messageCount: stats.messageCount,
    threadCount: stats.threadCount,
    createThread,
    updateThreadTitle,
    deleteThread,
    addMessage,
    updateMessage,
    selectThread,
    shouldShowUpgradePrompt,
  }

  return (
    <GuestChatContext.Provider value={value}>
      {children}
    </GuestChatContext.Provider>
  )
}
