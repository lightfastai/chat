"use client"

import { Button } from "@/components/ui/button"
import { AUTH_MODES, isAuthModeEnabled } from "@/lib/feature-flags"
import { cn } from "@/lib/utils"
import { Github, Mail, UserIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface SignInOptionsProps {
  onSignInComplete?: () => void
  className?: string
  buttonClassName?: string
  size?: "default" | "sm" | "lg" | "icon"
  showAnimations?: boolean
}

/**
 * Client component for sign in options
 * Used in dialogs and other client-side contexts
 */
export function SignInOptions({
  onSignInComplete,
  className,
  buttonClassName = "w-full",
  size = "lg",
  showAnimations = false,
}: SignInOptionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const animationClass = showAnimations ? "relative overflow-hidden group" : ""
  const animationElement = showAnimations ? (
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
  ) : null

  const handleSignIn = async (
    provider: "github" | "anonymous" | "password",
  ) => {
    setIsLoading(true)
    try {
      if (provider === "password") {
        // For password auth, redirect to dedicated sign-up/sign-in page
        router.push("/auth/password")
        onSignInComplete?.()
      } else {
        // For OAuth providers, use the loading page flow
        const params = new URLSearchParams({
          provider,
          redirectTo: "/chat",
        })
        router.push(`/auth/loading?${params.toString()}`)
        onSignInComplete?.()
      }
    } catch (error) {
      console.error("Error signing in:", error)
      toast.error("Failed to sign in. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* GitHub OAuth - only show if enabled */}
      {isAuthModeEnabled(AUTH_MODES.GITHUB) && (
        <Button
          onClick={() => handleSignIn("github")}
          className={cn(buttonClassName, animationClass, "cursor-pointer")}
          size={size}
          disabled={isLoading}
        >
          {animationElement}
          <Github className="w-5 h-5 mr-2" />
          Continue with GitHub
        </Button>
      )}

      {/* Password Authentication - only show if enabled */}
      {isAuthModeEnabled(AUTH_MODES.PASSWORD) && (
        <Button
          onClick={() => handleSignIn("password")}
          className={cn(buttonClassName, animationClass, "cursor-pointer")}
          size={size}
          disabled={isLoading}
        >
          {animationElement}
          <Mail className="w-5 h-5 mr-2" />
          Continue with Email
        </Button>
      )}

      {/* Anonymous - only show if enabled */}
      {isAuthModeEnabled(AUTH_MODES.ANONYMOUS) && (
        <Button
          onClick={() => handleSignIn("anonymous")}
          className={cn(buttonClassName, animationClass, "cursor-pointer")}
          size={size}
          disabled={isLoading}
        >
          {animationElement}
          <UserIcon className="w-5 h-5 mr-2" />
          Continue as Guest
        </Button>
      )}
    </div>
  )
}
