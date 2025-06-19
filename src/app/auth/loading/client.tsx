"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

interface AuthLoadingClientProps {
  provider?: string
  redirectTo?: string
  flow?: string
  email?: string
  password?: string
  name?: string
}

export function AuthLoadingClient({
  provider,
  redirectTo = "/chat",
  flow,
  email,
  password,
  name,
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
      if (
        !provider ||
        !["github", "anonymous", "password"].includes(provider)
      ) {
        router.push(`/signin?error=${encodeURIComponent("Invalid provider")}`)
        return
      }

      try {
        let signInPromise: Promise<void>

        if (provider === "password") {
          // Handle password authentication
          if (!flow || !email || !password) {
            router.push(
              `/signin?error=${encodeURIComponent("Missing password authentication parameters")}`,
            )
            return
          }

          if (flow === "signUp") {
            if (!name) {
              router.push(
                `/signin?error=${encodeURIComponent("Name is required for sign up")}`,
              )
              return
            }
            signInPromise = signIn("password", {
              flow: "signUp",
              email,
              password,
              name,
            })
          } else if (flow === "signIn") {
            signInPromise = signIn("password", {
              flow: "signIn",
              email,
              password,
            })
          } else {
            router.push(
              `/signin?error=${encodeURIComponent("Invalid password flow")}`,
            )
            return
          }
        } else {
          // Handle OAuth and anonymous authentication
          signInPromise = signIn(provider, { redirectTo })
        }

        // Add timeout to prevent infinite hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Sign in timed out")), 15000),
        )

        await Promise.race([signInPromise, timeoutPromise])

        // Redirect after successful authentication
        if (provider === "anonymous" || provider === "password") {
          router.push(redirectTo)
        }
        // For OAuth providers like GitHub, the browser will redirect automatically
      } catch (err) {
        console.error("Sign in error:", err)
        const errorMessage =
          err instanceof Error ? err.message : "Authentication failed"
        router.push(`/signin?error=${encodeURIComponent(errorMessage)}`)
      }
    }

    performSignIn()
  }, [provider, redirectTo, flow, email, password, name, signIn, router])

  // This component is hidden - all UI is handled by the server component
  return null
}
