"use client"

import { ErrorBoundaryUI } from "@/components/error/ErrorBoundaryUI"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Home,
  MessageSquare,
  MessageSquareOff,
  MessageSquareX,
  Plus,
  RefreshCw,
  Settings,
  Share2,
} from "lucide-react"

export default function ErrorPreviewPage() {
  return (
    <div className="container mx-auto py-8 space-y-12">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Error Boundary UI Preview</h1>
        <p className="text-muted-foreground">
          This page showcases all the error boundary states used throughout the
          application.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Global App Error */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Global App Error</h2>
          <div className="border rounded-lg">
            <ErrorBoundaryUI
              icon={AlertCircle}
              title="Something went wrong"
              description="We encountered an unexpected error. The issue has been logged and we'll look into it."
              actions={[
                {
                  label: "Try again",
                  icon: RefreshCw,
                  onClick: () => alert("Reset clicked"),
                },
                {
                  label: "Go home",
                  icon: Home,
                  href: "/",
                },
              ]}
            />
          </div>
        </section>

        {/* Chat Error */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Chat Error</h2>
          <div className="border rounded-lg">
            <ErrorBoundaryUI
              icon={MessageSquareOff}
              title="Chat Error"
              description="We encountered an error while loading the chat. This might be due to a connection issue or the chat might no longer be available."
              actions={[
                {
                  label: "Try again",
                  icon: RefreshCw,
                  onClick: () => alert("Reset clicked"),
                },
                {
                  label: "New chat",
                  icon: Plus,
                  onClick: () => alert("New chat clicked"),
                },
              ]}
            />
          </div>
        </section>

        {/* Thread Not Found */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Thread Not Found</h2>
          <div className="border rounded-lg">
            <ErrorBoundaryUI
              icon={MessageSquareX}
              title="Conversation Not Found"
              description="This conversation may have been deleted or the link may be incorrect."
              actions={[
                {
                  label: "Go back",
                  icon: ArrowLeft,
                  onClick: () => alert("Go back clicked"),
                },
                {
                  label: "New chat",
                  icon: Plus,
                  onClick: () => alert("New chat clicked"),
                },
              ]}
            />
          </div>
        </section>

        {/* Permission Error */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Permission Error</h2>
          <div className="border rounded-lg">
            <ErrorBoundaryUI
              icon={MessageSquareX}
              title="Unable to Load Conversation"
              description="You don't have permission to view this conversation."
              actions={[
                {
                  label: "Try again",
                  icon: RefreshCw,
                  onClick: () => alert("Reset clicked"),
                },
                {
                  label: "Go back",
                  icon: ArrowLeft,
                  onClick: () => alert("Go back clicked"),
                },
                {
                  label: "New chat",
                  icon: Plus,
                  onClick: () => alert("New chat clicked"),
                },
              ]}
            />
          </div>
        </section>

        {/* Share Link Expired */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Share Link Expired</h2>
          <div className="border rounded-lg">
            <ErrorBoundaryUI
              icon={Share2}
              title="Share Link Expired"
              description="This share link has expired. Please request a new one from the conversation owner."
              actions={[
                {
                  label: "Go home",
                  icon: Home,
                  href: "/",
                },
                {
                  label: "Start new chat",
                  icon: MessageSquare,
                  href: "/chat",
                },
              ]}
            />
          </div>
        </section>

        {/* Authentication Required */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Authentication Required</h2>
          <div className="border rounded-lg">
            <ErrorBoundaryUI
              icon={Settings}
              title="Authentication Required"
              description="You need to sign in to access your settings."
              actions={[
                {
                  label: "Go home",
                  icon: Home,
                  href: "/",
                },
                {
                  label: "Sign in",
                  href: "/signin",
                },
              ]}
            />
          </div>
        </section>

        {/* Critical Error (global-error.tsx style) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Critical Application Error</h2>
          <div className="border rounded-lg">
            <ErrorBoundaryUI
              icon={AlertTriangle}
              title="Application Error"
              description="A critical error occurred that prevented the application from loading properly. Please try refreshing the page."
              actions={[
                {
                  label: "Try again",
                  icon: RefreshCw,
                  onClick: () => alert("Reset clicked"),
                },
              ]}
            />
          </div>
        </section>

        {/* Test Error with Details */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Test Error (with details)</h2>
          <div className="border rounded-lg">
            <ErrorBoundaryUI
              icon={AlertCircle}
              iconColor="text-amber-500"
              title="Test Error Boundary Active!"
              description="This is the custom error boundary for the test-error route. Your error boundaries are working correctly!"
              error={{
                name: "Error",
                message:
                  "This is a test error to demonstrate error boundaries!",
                stack: `Error: This is a test error to demonstrate error boundaries!
    at throwError (test-error/page.tsx:7:11)
    at onClick (test-error/page.tsx:15:20)
    at HTMLButtonElement.callCallback (react-dom.development.js:3945:14)`,
                digest: "TEST123456789",
              }}
              showErrorDetails={true}
              actions={[
                {
                  label: "Try again",
                  icon: RefreshCw,
                  onClick: () => alert("Reset clicked"),
                },
                {
                  label: "Go home",
                  icon: Home,
                  href: "/",
                },
              ]}
            />
          </div>
        </section>

        {/* Different Icon Colors */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Different Icon Colors</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border rounded-lg">
              <ErrorBoundaryUI
                icon={AlertCircle}
                iconColor="text-destructive"
                title="Error State"
                description="Default error color"
                actions={[
                  {
                    label: "Action",
                    onClick: () => alert("Clicked"),
                  },
                ]}
              />
            </div>
            <div className="border rounded-lg">
              <ErrorBoundaryUI
                icon={AlertCircle}
                iconColor="text-amber-500"
                title="Warning State"
                description="Warning color variant"
                actions={[
                  {
                    label: "Action",
                    onClick: () => alert("Clicked"),
                  },
                ]}
              />
            </div>
            <div className="border rounded-lg">
              <ErrorBoundaryUI
                icon={AlertCircle}
                iconColor="text-blue-500"
                title="Info State"
                description="Information color variant"
                actions={[
                  {
                    label: "Action",
                    onClick: () => alert("Clicked"),
                  },
                ]}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
