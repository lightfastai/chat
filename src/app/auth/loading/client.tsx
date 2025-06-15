"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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

  useEffect(() => {
    async function performSignIn() {
      if (!provider || (provider !== "github" && provider !== "anonymous")) {
        setError("Invalid authentication provider")
        setTimeout(() => {
          router.push(`/signin?error=${encodeURIComponent("Invalid provider")}`)
        }, 2000)
        return
      }

      try {
        await signIn(provider, { redirectTo })
      } catch (err) {
        console.error("Sign in error:", err)
        setError("Failed to sign in")
        setTimeout(() => {
          router.push(
            `/signin?error=${encodeURIComponent("Authentication failed")}`,
          )
        }, 2000)
      }
    }

    performSignIn()
  }, [provider, redirectTo, signIn, router])

  if (error) {
    return (
      <div className="text-destructive">
        <p className="mb-2">{error}</p>
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    )
  }

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
