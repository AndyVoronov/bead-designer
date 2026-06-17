import { NextRequest, NextResponse } from "next/server";

/**
 * Admin page protection proxy (Next.js 16 convention).
 * Protects /admin/* PAGE routes by redirecting unauthenticated users to login.
 * API routes (/api/admin/*) are NOT intercepted here — each API handler
 * calls isAdmin() directly, which preserves the request body for POST/PUT/PATCH.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes — they have their own isAdmin() check
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Only intercept admin page routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow public admin pages
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Check admin token cookie
  const token = request.cookies.get("admin_token")?.value;

  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
