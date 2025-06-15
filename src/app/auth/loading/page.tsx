import { redirect } from "next/navigation"
import { AuthLoadingClient } from "./client"

export default function AuthLoadingPage({
  searchParams,
}: {
  searchParams: { provider?: string; redirectTo?: string }
}) {
  // If no provider is specified, redirect to signin
  if (!searchParams.provider) {
    redirect("/signin")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Signing you in...</h2>
        <AuthLoadingClient
          provider={searchParams.provider}
          redirectTo={searchParams.redirectTo}
        />
      </div>
    </div>
  )
}
