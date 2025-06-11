import { Card, CardContent } from "@/components/ui/card"
import { isAuthenticated } from "@/lib/auth"
import { Github } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { SignInButton } from "../../components/auth/SignInButton"

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

export default async function SignInPage() {
  const authenticated = await isAuthenticated()

  if (authenticated) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl bg-background/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Sign in to continue
              </h2>
              <p className="text-muted-foreground text-sm">
                Access your AI chat conversations
              </p>
            </div>

            <SignInButton
              className="w-full h-12 text-base font-medium relative overflow-hidden group"
              size="lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Github className="w-5 h-5 mr-2" />
              Continue with GitHub
            </SignInButton>

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
