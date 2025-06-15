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
        console.error("Invalid provider:", provider)
        router.push(`/signin?error=${encodeURIComponent("Invalid provider")}`)
        return
      }

      try {
        // Initiate sign in - this will cause a redirect for OAuth
        await signIn(provider, { redirectTo })
        // If we're still here (anonymous auth), the redirect will happen via Convex
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
