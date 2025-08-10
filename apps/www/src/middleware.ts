import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
	"/",
	"/api/health",
	"/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
	const { pathname } = req.nextUrl;
	const { userId } = await auth();
	const isAuthenticated = !!userId;

	// Redirect authenticated users from root to /chat
	if (pathname === "/" && isAuthenticated) {
		return NextResponse.redirect(new URL("/chat", req.url));
	}


	// Allow public routes
	if (isPublicRoute(req)) {
		return NextResponse.next();
	}

	// Redirect unauthenticated users to external auth with preserved destination
	if (!isAuthenticated) {
		const authUrl = process.env.NODE_ENV === "production" 
			? "https://auth.lightfast.ai"
			: "http://localhost:4104";
		const redirectUrl = `${authUrl}/sign-in?redirect_url=${encodeURIComponent(req.url)}`;
		return NextResponse.redirect(redirectUrl);
	}

	// Let Next.js handle all routing
	return NextResponse.next();
});

export const config = {
	// The following matcher runs middleware on all routes
	// except static assets.
	matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
