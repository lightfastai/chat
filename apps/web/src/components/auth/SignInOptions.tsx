"use client"

import { Button } from "@/components/ui/button"
import { env } from "@/env"
import { cn } from "@/lib/utils"
import { useAuthActions } from "@convex-dev/auth/react"
import { Github, UserIcon } from "lucide-react"

interface SignInOptionsProps {
  onSignInComplete?: () => void
  className?: string
  buttonClassName?: string
  size?: "default" | "sm" | "lg" | "icon"
  showAnimations?: boolean
}

export function SignInOptions({
  onSignInComplete,
  className,
  buttonClassName = "w-full",
  size = "lg",
  showAnimations = false,
}: SignInOptionsProps) {
  const { signIn } = useAuthActions()

  const animationClass = showAnimations ? "relative overflow-hidden group" : ""

  const animationElement = showAnimations ? (
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
  ) : null

  const handleSignIn = async (provider: "github" | "anonymous") => {
    try {
      await signIn(provider, { redirectTo: "/chat" })
      onSignInComplete?.()
    } catch (error) {
      console.error("Error signing in:", error)
    }
  }

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Hide GitHub login in Vercel previews */}
      {env.NEXT_PUBLIC_VERCEL_ENV === "production" && (
        <Button
          onClick={() => handleSignIn("github")}
          className={cn(
            `${buttonClassName} ${animationClass}`,
            "cursor-pointer",
          )}
          size={size}
        >
          {animationElement}
          <Github className="w-5 h-5 mr-2" />
          Continue with GitHub
        </Button>
      )}

      {/* Show anonymous login in all non-production environments */}
      {env.NEXT_PUBLIC_VERCEL_ENV !== "production" && (
        <Button
          onClick={() => handleSignIn("anonymous")}
          className={cn(
            `${buttonClassName} ${animationClass}`,
            "cursor-pointer",
          )}
          size={size}
        >
          {animationElement}
          <UserIcon className="w-5 h-5 mr-2" />
          Continue as Guest
        </Button>
      )}
    </div>
  )
}
