"use client"

import { validateSignInAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { env } from "@/env"
import { cn } from "@/lib/utils"
import { useAuthActions } from "@convex-dev/auth/react"
import { Github, UserIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

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
  const [isPending, startTransition] = useTransition()

  const animationClass = showAnimations ? "relative overflow-hidden group" : ""

  const animationElement = showAnimations ? (
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
  ) : null

  const handleSignIn = (provider: "github" | "anonymous") => {
    startTransition(async () => {
      try {
        // Validate parameters on the server first
        const validation = await validateSignInAction(provider, "/chat")
        
        if (!validation.valid) {
          toast.error(validation.error || "Invalid sign in request")
          return
        }

        // Execute the OAuth flow on the client
        await signIn(provider, { redirectTo: "/chat" })
        onSignInComplete?.()
      } catch (error) {
        console.error("Error signing in:", error)
        toast.error("Failed to sign in. Please try again.")
      }
    })
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
          disabled={isPending}
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
          disabled={isPending}
        >
          {animationElement}
          <UserIcon className="w-5 h-5 mr-2" />
          Continue as Guest
        </Button>
      )}
    </div>
  )
}
