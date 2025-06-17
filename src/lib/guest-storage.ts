import { nanoid } from "@/lib/nanoid"

export interface GuestMessage {
  id: string
  threadId: string
  content: string
  role: "user" | "assistant" | "system"
  createdAt: number
  model?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface GuestThread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
  model: string
}

export interface GuestData {
  threads: GuestThread[]
  messages: Record<string, GuestMessage[]>
  createdAt: number
}

const GUEST_STORAGE_KEY = "lightfast_guest_data"
const MAX_GUEST_THREADS = 5
const MAX_MESSAGES_PER_THREAD = 50

export class GuestStorage {
  private static instance: GuestStorage

  static getInstance(): GuestStorage {
    if (!GuestStorage.instance) {
      GuestStorage.instance = new GuestStorage()
    }
    return GuestStorage.instance
  }

  private constructor() {}

  private getData(): GuestData {
    if (typeof window === "undefined") {
      return { threads: [], messages: {}, createdAt: Date.now() }
    }

    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY)
      if (!stored) {
        const data: GuestData = {
          threads: [],
          messages: {},
          createdAt: Date.now(),
        }
        this.saveData(data)
        return data
      }
      return JSON.parse(stored)
    } catch {
      const data: GuestData = {
        threads: [],
        messages: {},
        createdAt: Date.now(),
      }
      this.saveData(data)
      return data
    }
  }

  private saveData(data: GuestData): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data))
    }
  }

  getThreads(): GuestThread[] {
    const data = this.getData()
    return data.threads.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  getThread(threadId: string): GuestThread | null {
    const data = this.getData()
    return data.threads.find((t) => t.id === threadId) || null
  }

  createThread(title: string, model: string): GuestThread | null {
    const data = this.getData()

    // Check thread limit
    if (data.threads.length >= MAX_GUEST_THREADS) {
      return null
    }

    const thread: GuestThread = {
      id: nanoid(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
      model,
    }

    data.threads.push(thread)
    data.messages[thread.id] = []
    this.saveData(data)

    return thread
  }

  updateThreadTitle(threadId: string, title: string): void {
    const data = this.getData()
    const thread = data.threads.find((t) => t.id === threadId)
    if (thread) {
      thread.title = title
      thread.updatedAt = Date.now()
      this.saveData(data)
    }
  }

  deleteThread(threadId: string): void {
    const data = this.getData()
    data.threads = data.threads.filter((t) => t.id !== threadId)
    delete data.messages[threadId]
    this.saveData(data)
  }

  getMessages(threadId: string): GuestMessage[] {
    const data = this.getData()
    return data.messages[threadId] || []
  }

  addMessage(
    threadId: string,
    message: Omit<GuestMessage, "id" | "threadId" | "createdAt">,
  ): GuestMessage | null {
    const data = this.getData()
    const thread = data.threads.find((t) => t.id === threadId)

    if (!thread) return null

    // Check message limit
    const messages = data.messages[threadId] || []
    if (messages.length >= MAX_MESSAGES_PER_THREAD) {
      return null
    }

    const newMessage: GuestMessage = {
      ...message,
      id: nanoid(),
      threadId,
      createdAt: Date.now(),
    }

    data.messages[threadId] = [...messages, newMessage]
    thread.messageCount = data.messages[threadId].length
    thread.updatedAt = Date.now()
    this.saveData(data)

    return newMessage
  }

  updateMessage(
    threadId: string,
    messageId: string,
    updates: Partial<GuestMessage>,
  ): void {
    const data = this.getData()
    const messages = data.messages[threadId]

    if (!messages) return

    const messageIndex = messages.findIndex((m) => m.id === messageId)
    if (messageIndex !== -1) {
      messages[messageIndex] = { ...messages[messageIndex], ...updates }
      const thread = data.threads.find((t) => t.id === threadId)
      if (thread) {
        thread.updatedAt = Date.now()
      }
      this.saveData(data)
    }
  }

  getStats(): {
    threadCount: number
    messageCount: number
    storageAge: number
  } {
    const data = this.getData()
    const messageCount = Object.values(data.messages).reduce(
      (sum, msgs) => sum + msgs.length,
      0,
    )
    const storageAge = Date.now() - data.createdAt

    return {
      threadCount: data.threads.length,
      messageCount,
      storageAge,
    }
  }

  canCreateThread(): boolean {
    const data = this.getData()
    return data.threads.length < MAX_GUEST_THREADS
  }

  canAddMessage(threadId: string): boolean {
    const data = this.getData()
    const messages = data.messages[threadId] || []
    return messages.length < MAX_MESSAGES_PER_THREAD
  }

  clear(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(GUEST_STORAGE_KEY)
    }
  }

  exportData(): GuestData {
    return this.getData()
  }
}

export const guestStorage = GuestStorage.getInstance()
