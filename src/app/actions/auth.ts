"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

const signInSchema = z.object({
  provider: z.enum(["github", "anonymous"]),
  redirectTo: z.string().optional().default("/chat"),
})

const passwordSignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  redirectTo: z.string().optional().default("/chat"),
})

const passwordSignUpSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    name: z.string().min(1, "Name is required"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    redirectTo: z.string().optional().default("/chat"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

/**
 * Server action for handling signin form submissions
 * Redirects to a loading page that will trigger client-side auth
 */
export async function signInAction(formData: FormData) {
  try {
    const provider = formData.get("provider") as string
    const redirectTo = formData.get("redirectTo") as string | undefined

    const validatedData = signInSchema.parse({
      provider,
      redirectTo,
    })

    // Redirect to a loading page with auth parameters
    // This page will trigger the client-side OAuth flow
    const params = new URLSearchParams({
      provider: validatedData.provider,
      redirectTo: validatedData.redirectTo,
    })

    redirect(`/auth/loading?${params.toString()}`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirect(
        `/signin?error=${encodeURIComponent("Invalid sign in parameters")}`,
      )
    }

    // Re-throw redirects
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error
    }

    console.error("Sign in error:", error)
    redirect(
      `/signin?error=${encodeURIComponent("Failed to sign in. Please try again.")}`,
    )
  }
}

/**
 * Server action for password-based sign in
 */
export async function passwordSignInAction(formData: FormData) {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const redirectTo = formData.get("redirectTo") as string | undefined

    const validatedData = passwordSignInSchema.parse({
      email,
      password,
      redirectTo,
    })

    // Redirect to loading page with password sign-in parameters
    const params = new URLSearchParams({
      provider: "password",
      flow: "signIn",
      email: validatedData.email,
      password: validatedData.password,
      redirectTo: validatedData.redirectTo,
    })

    redirect(`/auth/loading?${params.toString()}`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage =
        error.errors[0]?.message || "Invalid sign in parameters"
      redirect(`/signin?error=${encodeURIComponent(errorMessage)}`)
    }

    // Re-throw redirects
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error
    }

    console.error("Password sign in error:", error)
    redirect(
      `/signin?error=${encodeURIComponent("Failed to sign in. Please try again.")}`,
    )
  }
}

/**
 * Server action for password-based sign up
 */
export async function passwordSignUpAction(formData: FormData) {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const redirectTo = formData.get("redirectTo") as string | undefined

    const validatedData = passwordSignUpSchema.parse({
      email,
      password,
      name,
      confirmPassword,
      redirectTo,
    })

    // Redirect to loading page with password sign-up parameters
    const params = new URLSearchParams({
      provider: "password",
      flow: "signUp",
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
      redirectTo: validatedData.redirectTo,
    })

    redirect(`/auth/loading?${params.toString()}`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage =
        error.errors[0]?.message || "Invalid sign up parameters"
      redirect(`/signin?error=${encodeURIComponent(errorMessage)}`)
    }

    // Re-throw redirects
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error
    }

    console.error("Password sign up error:", error)
    redirect(
      `/signin?error=${encodeURIComponent("Failed to create account. Please try again.")}`,
    )
  }
}
