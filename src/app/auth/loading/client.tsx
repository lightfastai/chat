"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

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
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const hasInitiated = useRef(false)

  useEffect(() => {
    // Prevent double execution
    if (hasInitiated.current) return
    hasInitiated.current = true

    async function performSignIn() {
      // Validate provider
      if (!provider || (provider !== "github" && provider !== "anonymous")) {
        console.error("Invalid provider:", provider)
        setError("Invalid authentication provider")
        setIsInitializing(false)
        setTimeout(() => {
          router.push(`/signin?error=${encodeURIComponent("Invalid provider")}`)
        }, 2000)
        return
      }

      try {
        // Small delay to show loading state before redirect
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Initiate sign in - this will cause a redirect for OAuth
        await signIn(provider, { redirectTo })

        // For anonymous auth, we might still be here
        setIsInitializing(false)
      } catch (err) {
        console.error("Sign in error:", err)
        setError("Failed to sign in")
        setIsInitializing(false)
        setTimeout(() => {
          router.push(
            `/signin?error=${encodeURIComponent("Authentication failed")}`,
          )
        }, 2000)
      }
    }

    performSignIn()
  }, [provider, redirectTo, signIn, router])

  // Show loading state initially
  if (isInitializing && !error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          Please wait while we authenticate you...
        </p>
        <noscript>
          <p className="text-sm text-muted-foreground mt-4">
            JavaScript is required to complete sign in.
            <br />
            Please enable JavaScript and try again.
          </p>
        </noscript>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="text-destructive">
        <p className="mb-2">{error}</p>
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    )
  }

  // Still loading after initialization (might happen with anonymous auth)
  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Completing authentication...</p>
    </div>
  )
}
