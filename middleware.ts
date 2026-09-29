import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Public routes that don't require authentication
  const isPublicRoute =
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/favicon");

  // Authenticated routes
  const isAuthenticatedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/location") ||
    pathname.startsWith("/safety") ||
    pathname.startsWith("/devices") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin");

  // If user is authenticated and tries to access login/signup, redirect to dashboard
  if (isAuthenticated && (pathname === "/auth/signin" || pathname === "/auth/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If user is not authenticated and tries to access protected route, redirect to login
  if (!isAuthenticated && isAuthenticatedRoute) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Allow the request to proceed
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
