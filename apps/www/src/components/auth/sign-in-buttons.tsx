import { signInAction } from "@/app/actions/auth"
import { env } from "@/env"
import { Button } from "@lightfast/ui/components/ui/button"
import { cn } from "@lightfast/ui/lib/utils"
import { Github, UserIcon } from "lucide-react"

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
      {/* Hide GitHub login in Vercel previews */}
      {env.NEXT_PUBLIC_VERCEL_ENV === "production" && (
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
