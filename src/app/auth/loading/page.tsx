import { Loader2 } from "lucide-react"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { AuthLoadingClient } from "./client"

export default async function AuthLoadingPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; redirectTo?: string }>
}) {
  const params = await searchParams
  // If no provider is specified, redirect to signin
  if (!params.provider) {
    redirect("/signin")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Signing you in...</h2>

        {/* SSR loading state */}
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Preparing authentication...</p>
        </div>

        {/* Client component loads in background */}
        <Suspense fallback={null}>
          <div className="hidden">
            <AuthLoadingClient
              provider={params.provider}
              redirectTo={params.redirectTo}
            />
          </div>
        </Suspense>

        {/* No JS fallback */}
        <noscript>
          <p className="text-sm text-destructive mt-4">
            JavaScript is required to complete sign in.
            <br />
            Please enable JavaScript and refresh the page.
          </p>
        </noscript>
      </div>
    </div>
  )
}
