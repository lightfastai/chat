import { SignInButtons } from "@/components/auth/SignInButtons"
import { Card, CardContent } from "@/components/ui/card"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Sign In - Lightfast",
  description:
    "Sign in to access your AI chat conversations with real-time streaming responses.",
  keywords: [
    "AI chat",
    "sign in",
    "authentication",
    "GitHub OAuth",
    "real-time chat",
  ],
  openGraph: {
    title: "Sign In - AI Chat",
    description:
      "Sign in to access your AI chat conversations with real-time streaming responses.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sign In - AI Chat",
    description:
      "Sign in to access your AI chat conversations with real-time streaming responses.",
  },
}

interface SignInPageProps {
  searchParams: {
    from?: string
    error?: string
  }
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  // Authentication check moved to middleware for better performance
  const redirectTo = searchParams.from || "/chat"
  const error = searchParams.error

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl bg-background">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Sign in to continue
              </h2>
              <p className="text-muted-foreground text-sm">
                Access your AI chat conversations
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center">
                {decodeURIComponent(error)}
              </div>
            )}

            <SignInButtons redirectTo={redirectTo} />

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our{" "}
                <Link
                  href="https://lightfast.ai/legal/terms"
                  target="_blank"
                  className="underline"
                >
                  terms
                </Link>{" "}
                and{" "}
                <Link
                  href="https://lightfast.ai/legal/privacy"
                  target="_blank"
                  className="underline"
                >
                  privacy policy
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
