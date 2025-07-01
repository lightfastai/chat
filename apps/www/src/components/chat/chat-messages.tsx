"use client"

import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Doc } from "../../../convex/_generated/dataModel"
import { MessageDisplay } from "./message-display"

type Message = Doc<"messages">

interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
  emptyState?: {
    icon?: React.ReactNode
    title?: string
    description?: string
  }
}

export function ChatMessages({
  messages,
  isLoading = false,
}: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const lastMessageCountRef = useRef(messages.length)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastScrollPositionRef = useRef(0)

  // Check if user is near bottom of scroll area
  const checkIfNearBottom = useCallback(() => {
    if (!viewportRef.current) return true

    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    // Consider "near bottom" if within 50px of the bottom (reduced from 100px)
    return distanceFromBottom < 50
  }, [])

  // Smooth scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (!viewportRef.current) return

    viewportRef.current.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    })
  }, [])

  // Set up viewport ref when component mounts
  useEffect(() => {
    if (scrollAreaRef.current) {
      // Find the viewport element within the ScrollArea
      const viewport = scrollAreaRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]',
      )
      if (viewport instanceof HTMLDivElement) {
        viewportRef.current = viewport

        // Set up scroll listener to track if user is near bottom and detect user scrolling
        const handleScroll = () => {
          const currentScrollTop = viewport.scrollTop
          const scrollDelta = currentScrollTop - lastScrollPositionRef.current

          // Detect if user is scrolling up (negative delta) or manually scrolling
          if (scrollDelta < -5) {
            setIsUserScrolling(true)

            // Clear any existing timeout
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current)
            }

            // Reset user scrolling flag after 2 seconds of no scrolling
            scrollTimeoutRef.current = setTimeout(() => {
              setIsUserScrolling(false)
            }, 2000)
          }

          lastScrollPositionRef.current = currentScrollTop
          setIsNearBottom(checkIfNearBottom())
        }

        viewport.addEventListener("scroll", handleScroll, { passive: true })
        return () => {
          viewport.removeEventListener("scroll", handleScroll)
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
          }
        }
      }
    }
  }, [checkIfNearBottom])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (!messages.length) return

    const hasNewMessage = messages.length > lastMessageCountRef.current
    lastMessageCountRef.current = messages.length

    // Check if any message is currently streaming
    const hasStreamingMessage = messages.some(
      (msg) => msg.isStreaming && !msg.isComplete,
    )

    // Auto-scroll if:
    // 1. User is NOT actively scrolling
    // 2. User is near bottom
    // 3. There's a new message OR streaming message
    if (
      !isUserScrolling &&
      isNearBottom &&
      (hasNewMessage || hasStreamingMessage)
    ) {
      // Use instant scroll for new messages, smooth for streaming updates
      scrollToBottom(!hasNewMessage)
    }

    // If there's a new message and user is scrolling, reset the user scrolling flag
    // This ensures they see their own messages
    if (hasNewMessage && messages[0]?.messageType === "user") {
      setIsUserScrolling(false)
      scrollToBottom(false)
    }
  }, [messages, isNearBottom, isUserScrolling, scrollToBottom])

  // Scroll to bottom on initial load
  useEffect(() => {
    scrollToBottom(false)
  }, [scrollToBottom])

  return (
    <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
      <div className="p-2 md:p-4 pb-16">
        <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
          {messages
            ?.slice()
            .reverse()
            .map((msg) => (
              <MessageDisplay key={msg._id} message={msg} userName="User" />
            ))}

          {isLoading && (
            <div className="text-center text-muted-foreground py-4">
              <div className="animate-pulse">Generating response...</div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll to bottom button when user has scrolled up */}
      {!isNearBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setIsUserScrolling(false)
            scrollToBottom()
          }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          aria-label="Scroll to bottom"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      )}
    </ScrollArea>
  )
}
