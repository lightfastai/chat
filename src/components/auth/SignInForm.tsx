"use client"

import { type SignInState, signInAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { env } from "@/env"
import { cn } from "@/lib/utils"
import { useAuthActions } from "@convex-dev/auth/react"
import { Github, Loader2, UserIcon } from "lucide-react"
import { useEffect } from "react"
import { useFormState, useFormStatus } from "react-dom"
import { toast } from "sonner"

interface SignInFormProps {
  onSignInComplete?: () => void
  className?: string
  buttonClassName?: string
  size?: "default" | "sm" | "lg" | "icon"
  showAnimations?: boolean
}

function SubmitButton({
  provider,
  children,
  className,
  size,
  showAnimations,
}: {
  provider: "github" | "anonymous"
  children: React.ReactNode
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  showAnimations?: boolean
}) {
  const { pending } = useFormStatus()

  const animationClass = showAnimations ? "relative overflow-hidden group" : ""
  const animationElement = showAnimations ? (
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
  ) : null

  return (
    <Button
      type="submit"
      name="provider"
      value={provider}
      className={cn(className, animationClass, "cursor-pointer")}
      size={size}
      disabled={pending}
    >
      {animationElement}
      {pending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : children}
    </Button>
  )
}

export function SignInForm({
  onSignInComplete,
  className,
  buttonClassName = "w-full",
  size = "lg",
  showAnimations = false,
}: SignInFormProps) {
  const { signIn } = useAuthActions()
  const [state, formAction] = useFormState<SignInState, FormData>(
    signInAction,
    {},
  )

  // Handle successful server validation by triggering client-side sign in
  useEffect(() => {
    if (state.success && state.provider) {
      signIn(state.provider, { redirectTo: state.redirectTo || "/chat" })
        .then(() => {
          onSignInComplete?.()
        })
        .catch((error) => {
          console.error("Client sign in error:", error)
          toast.error("Failed to complete sign in")
        })
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, signIn, onSignInComplete])

  return (
    <form action={formAction} className={`space-y-3 ${className || ""}`}>
      <input type="hidden" name="redirectTo" value="/chat" />

      {/* Hide GitHub login in Vercel previews */}
      {env.NEXT_PUBLIC_VERCEL_ENV === "production" && (
        <SubmitButton
          provider="github"
          className={buttonClassName}
          size={size}
          showAnimations={showAnimations}
        >
          <>
            <Github className="w-5 h-5 mr-2" />
            Continue with GitHub
          </>
        </SubmitButton>
      )}

      {/* Show anonymous login in all non-production environments */}
      {env.NEXT_PUBLIC_VERCEL_ENV !== "production" && (
        <SubmitButton
          provider="anonymous"
          className={buttonClassName}
          size={size}
          showAnimations={showAnimations}
        >
          <>
            <UserIcon className="w-5 h-5 mr-2" />
            Continue as Guest
          </>
        </SubmitButton>
      )}
    </form>
  )
}
