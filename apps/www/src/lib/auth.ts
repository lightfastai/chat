"use server"

import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { fetchMutation, fetchQuery } from "convex/nextjs"
import { api } from "../../convex/_generated/api"

/**
 * Get the current user's information on the server side
 * This can be used in Server Components and Server Actions
 */
export async function getCurrentUser() {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) {
      return null
    }

    const user = await fetchQuery(api.users.current, {}, { token })
    return user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

/**
 * Check if the user is authenticated on the server side
 * This can be used in middleware, Server Components, and Server Actions
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const token = await convexAuthNextjsToken()
    return !!token
  } catch (error) {
    console.error("Error checking authentication:", error)
    return false
  }
}

/**
 * Helper to get the authentication token for server-side Convex calls
 */
export async function getAuthToken() {
  try {
    return await convexAuthNextjsToken()
  } catch (error) {
    console.error("Error getting auth token:", error)
    return null
  }
}

/**
 * Example of calling an authenticated Convex function from a Server Action
 * You can use this pattern for other authenticated server-side operations
 */
export async function serverCreateThread(title: string) {
  try {
    const token = await convexAuthNextjsToken()
    if (!token) {
      throw new Error("User must be authenticated")
    }

    const threadId = await fetchMutation(
      api.threads.create,
      { title },
      { token },
    )

    return { success: true, threadId }
  } catch (error) {
    console.error("Error creating thread:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
