"use client"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react"

interface AuthWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
  requireAuth?: boolean
}

/**
 * Wrapper component that handles authentication states
 * Shows different content based on authentication status
 */
export function AuthWrapper({
  children,
  fallback,
  loadingComponent,
  requireAuth = false,
}: AuthWrapperProps) {
  const defaultLoadingComponent = (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>
            Please wait while we authenticate you.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )

  const defaultFallback = (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>
            Please sign in to access this content.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )

  return (
    <>
      <AuthLoading>{loadingComponent || defaultLoadingComponent}</AuthLoading>

      <Authenticated>{children}</Authenticated>

      <Unauthenticated>
        {requireAuth ? fallback || defaultFallback : children}
      </Unauthenticated>
    </>
  )
}

/**
 * Simple wrapper that only shows content when authenticated
 */
export function AuthenticatedOnly({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <AuthWrapper requireAuth={true} fallback={fallback}>
      {children}
    </AuthWrapper>
  )
}

/**
 * Simple wrapper that only shows content when unauthenticated
 */
export function UnauthenticatedOnly({
  children,
}: {
  children: React.ReactNode
}) {
  return <Unauthenticated>{children}</Unauthenticated>
}
