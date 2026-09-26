// @ts-nocheck - NextAuth v5 beta type incompatibility with Next.js 16 generated types
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Routes anyone can access (public)
const PUBLIC_ROUTES = ["/auth/signin", "/auth/signup", "/auth/error", "/auth/signout"];

// Routes only unauthenticated users should see (redirect to dashboard if logged in)
const AUTH_ROUTES = ["/auth/signin", "/auth/signup"];

// Admin-only routes
const ADMIN_ROUTES = ["/admin"];

// Default export: the proxy function (replaces the old `middleware` default export)
export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const path = nextUrl.pathname;

  // Set locale cookie if not present (for i18n, cookie-based detection)
  const response = NextResponse.next();
  const locale = req.cookies.get('NEXT_LOCALE')?.value || 'en';
  if (!req.cookies.get('NEXT_LOCALE')) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 31536000 // 1 year
    });
  }

  // Allow public routes always
  if (PUBLIC_ROUTES.some((p) => path === p || path.startsWith(`${p}/`))) {
    if (isLoggedIn && AUTH_ROUTES.some((p) => path === p)) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return response;
  }

  // API routes — let the route handlers enforce auth themselves
  if (path.startsWith("/api/")) {
    return response;
  }

  // Admin routes require ADMIN or SUPER_ADMIN
  if (ADMIN_ROUTES.some((p) => path === p || path.startsWith(`${p}/`))) {
    if (!isLoggedIn) {
      const signInUrl = new URL("/auth/signin", nextUrl);
      signInUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(signInUrl);
    }
    const role = (req.auth?.user as any)?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard?error=forbidden", nextUrl));
    }
  }

  // Everything else (dashboard, settings, alerts, etc.) requires sign-in
  if (!isLoggedIn) {
    const signInUrl = new URL("/auth/signin", nextUrl);
    signInUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(signInUrl);
  }

  return response;
});

// Run on all paths except static assets and Next internals.
// robots.txt is included in the public-files list so crawlers can fetch
// it without being redirected to the signin page.
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public files (images, manifest, service worker, robots.txt, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap.*\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|js|css|woff|woff2|ttf|eot)$).*)",
  ],
};
