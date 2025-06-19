"use client"

import { passwordSignInAction, passwordSignUpAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { useState, useTransition } from "react"

interface PasswordAuthFormProps {
  redirectTo?: string
  buttonClassName?: string
  size?: "default" | "sm" | "lg" | "icon"
  showAnimations?: boolean
}

/**
 * Client component for password-based authentication
 * Supports both sign-in and sign-up flows
 */
export function PasswordAuthForm({
  redirectTo = "/chat",
  buttonClassName = "w-full",
  size = "lg",
  showAnimations = false,
}: PasswordAuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const animationClass = showAnimations ? "relative overflow-hidden group" : ""
  const animationElement = showAnimations ? (
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
  ) : null

  const handleSubmit = async (formData: FormData) => {
    setError(null)

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Client-side validation
    if (!email || !password) {
      setError("Email and password are required")
      return
    }

    if (isSignUp) {
      if (!name) {
        setError("Name is required for sign up")
        return
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters long")
        return
      }
    }

    startTransition(async () => {
      try {
        // Add redirectTo to form data
        formData.append("redirectTo", redirectTo)

        if (isSignUp) {
          await passwordSignUpAction(formData)
        } else {
          await passwordSignInAction(formData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed")
      }
    })
  }

  return (
    <div className="space-y-4">
      <form action={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              className="pl-10"
              required
              disabled={isPending}
            />
          </div>
        </div>

        {/* Name Field (Sign Up Only) */}
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your name"
              required
              disabled={isPending}
            />
          </div>
        )}

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder={
                isSignUp
                  ? "Create a password (8+ characters)"
                  : "Enter your password"
              }
              className="pl-10 pr-10"
              required
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={isPending}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password Field (Sign Up Only) */}
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                className="pl-10 pr-10"
                required
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isPending}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className={cn(buttonClassName, animationClass, "cursor-pointer")}
          size={size}
          disabled={isPending}
        >
          {animationElement}
          {isPending ? (
            "Loading..."
          ) : (
            <>
              <Mail className="w-5 h-5 mr-2" />
              {isSignUp ? "Create Account" : "Sign In with Email"}
            </>
          )}
        </Button>
      </form>

      {/* Toggle between Sign In and Sign Up */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError(null)
          }}
          className="text-sm text-muted-foreground hover:text-foreground underline"
          disabled={isPending}
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}
