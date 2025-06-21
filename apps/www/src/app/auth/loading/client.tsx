"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

interface AuthLoadingClientProps {
  provider?: string
  redirectTo?: string
}

export function AuthLoadingClient({
  provider,
  redirectTo = "/chat",
}: AuthLoadingClientProps) {
  const { signIn } = useAuthActions()
  const router = useRouter()
  const hasInitiated = useRef(false)

  useEffect(() => {
    // Prevent double execution
    if (hasInitiated.current) return
    hasInitiated.current = true

    async function performSignIn() {
      // Validate provider
      if (!provider || (provider !== "github" && provider !== "anonymous")) {
        router.push(`/signin?error=${encodeURIComponent("Invalid provider")}`)
        return
      }

      try {
        // Add timeout to prevent infinite hanging
        const signInPromise = signIn(provider, { redirectTo })
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Sign in timed out")), 10000),
        )

        await Promise.race([signInPromise, timeoutPromise])

        // For anonymous auth, we need to manually redirect
        if (provider === "anonymous") {
          router.push(redirectTo)
        }
        // For OAuth providers like GitHub, the browser will redirect automatically
      } catch (err) {
        console.error("Sign in error:", err)
        router.push(
          `/signin?error=${encodeURIComponent("Authentication failed")}`,
        )
      }
    }

    performSignIn()
  }, [provider, redirectTo, signIn, router])

  // This component is hidden - all UI is handled by the server component
  return null
}
