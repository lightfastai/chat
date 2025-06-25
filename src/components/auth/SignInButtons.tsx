import { signInAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { env } from "@/env"
import { cn } from "@/lib/utils"
import { Github, UserIcon } from "lucide-react"

// Google icon component since lucide doesn't have one
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

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
      {/* Hide OAuth logins in Vercel previews except production */}
      {env.NEXT_PUBLIC_VERCEL_ENV === "production" && (
        <>
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

          <form action={signInAction}>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Button
              type="submit"
              name="provider"
              value="google"
              className={cn(buttonClassName, animationClass, "cursor-pointer")}
              size={size}
            >
              {animationElement}
              <GoogleIcon className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>
          </form>
        </>
      )}

      {/* Show anonymous login in all non-production environments */}
      {env.NEXT_PUBLIC_VERCEL_ENV !== "production" && (
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
