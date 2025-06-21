import { signInAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { AUTH_MODES, isAuthModeEnabled } from "@/lib/feature-flags"
import { cn } from "@/lib/utils"
import { Github, Mail, UserIcon } from "lucide-react"
import Link from "next/link"

interface SignInButtonsProps {
  className?: string
  buttonClassName?: string
  size?: "default" | "sm" | "lg" | "icon"
  showAnimations?: boolean
  redirectTo?: string
}

/**
 * Server component for sign in buttons
 * Renders a form that posts to server actions
 */
export function SignInButtons({
  className,
  buttonClassName = "w-full",
  size = "lg",
  showAnimations = false,
  redirectTo = "/chat",
}: SignInButtonsProps) {
  const animationClass = showAnimations ? "relative overflow-hidden group" : ""

  const animationElement = showAnimations ? (
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
  ) : null

  return (
    <div className={cn("space-y-3", className)}>
      {/* GitHub OAuth - only show if enabled */}
      {isAuthModeEnabled(AUTH_MODES.GITHUB) && (
        <form action={signInAction}>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Button
            type="submit"
            name="provider"
            value="github"
            className={cn(buttonClassName, animationClass, "cursor-pointer")}
            size={size}
          >
            {animationElement}
            <Github className="w-5 h-5 mr-2" />
            Continue with GitHub
          </Button>
        </form>
      )}

      {/* Password Authentication - only show if enabled */}
      {isAuthModeEnabled(AUTH_MODES.PASSWORD) && (
        <Link
          href={`/auth/password?redirectTo=${encodeURIComponent(redirectTo)}`}
        >
          <Button
            className={cn(buttonClassName, animationClass, "cursor-pointer")}
            size={size}
          >
            {animationElement}
            <Mail className="w-5 h-5 mr-2" />
            Continue with Email
          </Button>
        </Link>
      )}

      {/* Anonymous - only show if enabled */}
      {isAuthModeEnabled(AUTH_MODES.ANONYMOUS) && (
        <form action={signInAction}>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Button
            type="submit"
            name="provider"
            value="anonymous"
            className={cn(buttonClassName, animationClass, "cursor-pointer")}
            size={size}
          >
            {animationElement}
            <UserIcon className="w-5 h-5 mr-2" />
            Continue as Guest
          </Button>
        </form>
      )}
    </div>
  )
}
