import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server"
import { NextResponse } from "next/server"

const isSignInPage = createRouteMatcher(["/signin"])
const isProtectedRoute = createRouteMatcher(["/chat(.*)", "/settings(.*)"])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const { pathname } = request.nextUrl

  // Cache auth status for this request to avoid multiple checks
  const isAuthenticated = await convexAuth.isAuthenticated()

  // Redirect authenticated users from root to /chat
  if (pathname === "/" && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/chat")
  }

  // Redirect authenticated users away from auth pages
  if (isSignInPage(request) && isAuthenticated) {
    // Preserve the 'from' parameter if it exists
    const from = request.nextUrl.searchParams.get("from")
    const redirectTo = from || "/chat"
    return nextjsMiddlewareRedirect(request, redirectTo)
  }

  // Redirect unauthenticated users to signin with preserved destination
  if (isProtectedRoute(request) && !isAuthenticated) {
    const url = new URL("/signin", request.url)
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  // Add prefetch headers for chat routes to improve performance
  const response = NextResponse.next()

  if (isAuthenticated && pathname.startsWith("/chat")) {
    // Add cache headers for better navigation performance
    response.headers.set("Cache-Control", "public, max-age=0, must-revalidate")
    // Add prefetch hints for common resources
    response.headers.set(
      "Link",
      "</chat; rel=prefetch>, </chat/new; rel=prefetch>",
    )
  }

  return response
})

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
