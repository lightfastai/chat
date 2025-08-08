import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
	"/",
	"/sign-in(.*)",
	"/sign-up(.*)",
	"/api/health",
	"/api/webhooks(.*)",
]);

const isSignInPage = createRouteMatcher(["/sign-in"]);

export default clerkMiddleware(async (auth, req) => {
	const { pathname } = req.nextUrl;
	const { userId } = await auth();
	const isAuthenticated = !!userId;

	// Redirect authenticated users from root to /chat
	if (pathname === "/" && isAuthenticated) {
		return NextResponse.redirect(new URL("/chat", req.url));
	}

	// Redirect authenticated users away from auth pages
	if (isSignInPage(req) && isAuthenticated) {
		// Preserve the 'from' parameter if it exists
		const from = req.nextUrl.searchParams.get("from");
		const redirectTo = from || "/chat";
		return NextResponse.redirect(new URL(redirectTo, req.url));
	}

	// Allow public routes
	if (isPublicRoute(req)) {
		return NextResponse.next();
	}

	// Redirect unauthenticated users to sign-in with preserved destination
	if (!isAuthenticated) {
		const url = new URL("/sign-in", req.url);
		url.searchParams.set("redirect_url", pathname);
		return NextResponse.redirect(url);
	}

	// Let Next.js handle all routing
	return NextResponse.next();
});

export const config = {
	// The following matcher runs middleware on all routes
	// except static assets.
	matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
