"use client"

import { Button } from "@/components/ui/button"
import { useAuthActions } from "@convex-dev/auth/react"
import { LogIn } from "lucide-react"

interface SignInButtonProps {
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
  provider?: "github" // Can be extended for other providers
  children?: React.ReactNode
  onSignInStart?: () => void
  onSignInComplete?: () => void
}

export function SignInButton({
  className,
  size = "default",
  variant = "default",
  provider = "github",
  children,
  onSignInStart,
  onSignInComplete,
}: SignInButtonProps) {
  const { signIn } = useAuthActions()

  const handleSignIn = async () => {
    try {
      onSignInStart?.()
      await signIn(provider)
      onSignInComplete?.()
    } catch (error) {
      console.error("Error signing in:", error)
    }
  }

  return (
    <Button
      onClick={handleSignIn}
      className={className}
      size={size}
      variant={variant}
    >
      {children || (
        <>
          <LogIn className="w-4 h-4 mr-2" />
          Sign in with GitHub
        </>
      )}
    </Button>
  )
}
