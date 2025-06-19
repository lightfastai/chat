import { signInAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { features } from "@/lib/config/features"
import { cn } from "@/lib/utils"
import { Github, UserIcon } from "lucide-react"
import { PasswordAuthForm } from "./PasswordAuthForm"

interface SignInButtonsProps {
  className?: string
  buttonClassName?: string
  size?: "default" | "sm" | "lg" | "icon"
  showAnimations?: boolean
  redirectTo?: string
}

/**
 * Server component for sign in buttons
 * Renders authentication options based on feature flags
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
    <div className={cn("space-y-4", className)}>
      {/* Password Authentication (default, always first) */}
      {features.auth.password && (
        <PasswordAuthForm
          redirectTo={redirectTo}
          buttonClassName={buttonClassName}
          size={size}
          showAnimations={showAnimations}
        />
      )}

      {/* GitHub OAuth (when available) */}
      {features.auth.github && (
        <>
          {features.auth.password && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
          )}
          <form action={signInAction}>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Button
              type="submit"
              name="provider"
              value="github"
              variant={features.auth.password ? "outline" : "default"}
              className={cn(buttonClassName, animationClass, "cursor-pointer")}
              size={size}
            >
              {animationElement}
              <Github className="w-5 h-5 mr-2" />
              Continue with GitHub
            </Button>
          </form>
        </>
      )}

      {/* Anonymous Authentication (development/testing) */}
      {features.auth.anonymous && (
        <>
          {(features.auth.github || features.auth.password) && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue as guest
                </span>
              </div>
            </div>
          )}
          <form action={signInAction}>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Button
              type="submit"
              name="provider"
              value="anonymous"
              variant="outline"
              className={cn(buttonClassName, animationClass, "cursor-pointer")}
              size={size}
            >
              {animationElement}
              <UserIcon className="w-5 h-5 mr-2" />
              Continue as Guest
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
