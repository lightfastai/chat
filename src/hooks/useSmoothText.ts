"use client"

import { useEffect, useRef, useState } from "react"

interface UseSmoothTextOptions {
  /**
   * Characters per second to display
   * @default 50
   */
  charsPerSec?: number
  /**
   * Whether to enable smooth text animation
   * @default true
   */
  enabled?: boolean
  /**
   * Callback when text display completes
   */
  onComplete?: () => void
}

/**
 * Hook that provides typewriter-style text animation
 * Based on research from Convex agent SDK but simplified for our use case
 */
export function useSmoothText(
  text: string,
  options: UseSmoothTextOptions = {},
): [string, boolean] {
  const { charsPerSec = 50, enabled = true, onComplete } = options

  const [displayedText, setDisplayedText] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)

  // Track animation state
  const animationFrameRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number | undefined>(undefined)
  const lastTextRef = useRef<string>("")
  const completedRef = useRef(false)

  // Reset when text changes
  useEffect(() => {
    if (text !== lastTextRef.current) {
      lastTextRef.current = text
      completedRef.current = false
      if (enabled && text) {
        setDisplayedText("")
        setIsAnimating(true)
        startTimeRef.current = performance.now()
      } else {
        setDisplayedText(text)
        setIsAnimating(false)
      }
    }
  }, [text, enabled])

  // Animation loop
  useEffect(() => {
    if (!enabled || !isAnimating || !text) {
      return
    }

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime
      }

      const elapsed = currentTime - startTimeRef.current
      const charsToShow = Math.floor((elapsed / 1000) * charsPerSec)

      if (charsToShow >= text.length) {
        // Animation complete
        setDisplayedText(text)
        setIsAnimating(false)
        if (!completedRef.current) {
          completedRef.current = true
          onComplete?.()
        }
      } else {
        // Continue animation
        setDisplayedText(text.slice(0, charsToShow))
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [text, charsPerSec, enabled, isAnimating, onComplete])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return [displayedText, isAnimating]
}

/**
 * Hook for configurable smooth text speed based on user preference
 * Can be extended to read from user settings in the future
 */
export function useSmoothTextSpeed(): number {
  // TODO: In the future, read from user preferences
  // For now, return a sensible default
  return 50 // 50 chars/sec provides a nice reading experience
}
