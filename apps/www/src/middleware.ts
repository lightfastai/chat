import { getTimezoneFromRequest } from "@/lib/ip-timezone";
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isProtectedRoute = createRouteMatcher(["/chat(.*)", "/settings(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
	const { pathname } = request.nextUrl;

	// Cache auth status for this request to avoid multiple checks
	const isAuthenticated = await convexAuth.isAuthenticated();

	// Redirect authenticated users from root to /chat
	if (pathname === "/" && isAuthenticated) {
		return nextjsMiddlewareRedirect(request, "/chat");
	}

	// Redirect authenticated users away from auth pages
	if (isSignInPage(request) && isAuthenticated) {
		// Preserve the 'from' parameter if it exists
		const from = request.nextUrl.searchParams.get("from");
		const redirectTo = from || "/chat";
		return nextjsMiddlewareRedirect(request, redirectTo);
	}

	// Redirect unauthenticated users to signin with preserved destination
	if (isProtectedRoute(request) && !isAuthenticated) {
		const url = new URL("/signin", request.url);
		url.searchParams.set("from", pathname);
		return NextResponse.redirect(url);
	}

	// Add prefetch headers for chat routes to improve performance
	const response = NextResponse.next();

	// Validate chat thread routes
	const chatThreadMatch = pathname.match(/^\/chat\/(.+)$/);
	if (chatThreadMatch) {
		const clientId = chatThreadMatch[1];

		// Reserved routes that should not be treated as thread IDs
		const reservedRoutes = ["settings", "new"];
		const isReservedRoute =
			reservedRoutes.includes(clientId) || clientId.startsWith("settings/");

		// Validate clientId format - basic check to prevent obvious invalid IDs
		if (!clientId || clientId.length < 10 || isReservedRoute) {
			// Return 404 for invalid thread IDs
			return new NextResponse(null, { status: 404 });
		}
	}

	// Add IP-based timezone estimate to headers
	const timezoneEstimate = getTimezoneFromRequest(request);
	if (timezoneEstimate) {
		response.headers.set("x-user-timezone", timezoneEstimate);

		// Debug logging in development
		if (process.env.NODE_ENV === "development") {
			console.log("[Middleware] Detected timezone:", timezoneEstimate);
			console.log(
				"[Middleware] Country:",
				request.headers.get("x-vercel-ip-country"),
			);
			console.log(
				"[Middleware] Region:",
				request.headers.get("x-vercel-ip-country-region"),
			);
		}
	}

	return response;
});

export const config = {
	// The following matcher runs middleware on all routes
	// except static assets.
	matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
