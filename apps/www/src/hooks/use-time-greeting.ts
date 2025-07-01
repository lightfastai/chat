"use client"

import { useMemo } from "react"

export function useTimeGreeting() {
  const greeting = useMemo(() => {
    const hour = new Date().getHours()

    if (hour < 12) {
      return "Good morning"
    }
    if (hour < 17) {
      return "Good afternoon"
    }
    return "Good evening"
  }, [])

  return greeting
}
