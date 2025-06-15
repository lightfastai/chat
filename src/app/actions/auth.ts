"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

const signInSchema = z.object({
  provider: z.enum(["github", "anonymous"]),
  redirectTo: z.string().optional().default("/chat"),
})

export type SignInState = {
  error?: string
  success?: boolean
  provider?: "github" | "anonymous"
  redirectTo?: string
}

export async function signInAction(
  prevState: SignInState | null,
  formData: FormData,
): Promise<SignInState> {
  try {
    const provider = formData.get("provider") as string
    const redirectTo = formData.get("redirectTo") as string | undefined

    const validatedData = signInSchema.parse({
      provider,
      redirectTo,
    })

    // Return the validated data to trigger client-side sign in
    return {
      success: true,
      provider: validatedData.provider,
      redirectTo: validatedData.redirectTo,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid request data" }
    }

    console.error("Sign in error:", error)
    return { error: "Failed to sign in. Please try again." }
  }
}

/**
 * Validates sign in parameters on the server before client-side OAuth flow
 */
export async function validateSignInAction(
  provider: "github" | "anonymous",
  redirectTo: string = "/chat",
): Promise<{ valid: boolean; error?: string }> {
  try {
    signInSchema.parse({ provider, redirectTo })
    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: "Invalid sign in parameters" }
    }
    return { valid: false, error: "Validation failed" }
  }
}