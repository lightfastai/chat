"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

const signInSchema = z.object({
	provider: z.enum(["github", "anonymous"]),
	redirectTo: z.string().optional().default("/chat"),
});

/**
 * Server action for handling signin form submissions
 * Redirects to a loading page that will trigger client-side auth
 */
export async function signInAction(formData: FormData) {
	try {
		const provider = formData.get("provider") as string;
		const redirectTo = formData.get("redirectTo") as string | undefined;

		const validatedData = signInSchema.parse({
			provider,
			redirectTo,
		});

		// Redirect to a loading page with auth parameters
		// This page will trigger the client-side OAuth flow
		const params = new URLSearchParams({
			provider: validatedData.provider,
			redirectTo: validatedData.redirectTo,
		});

		redirect(`/auth/loading?${params.toString()}`);
	} catch (error) {
		if (error instanceof z.ZodError) {
			redirect(
				`/signin?error=${encodeURIComponent("Invalid sign in parameters")}`,
			);
		}

		// Re-throw redirects
		if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
			throw error;
		}

		console.error("Sign in error:", error);
		redirect(
			`/signin?error=${encodeURIComponent("Failed to sign in. Please try again.")}`,
		);
	}
}
