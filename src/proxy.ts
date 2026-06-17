import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("admin_token")?.value;

  // Whitelist the login page and auth API — no auth check needed
  if (pathname === "/admin/login" || pathname === "/api/admin/auth") {
    return NextResponse.next();
  }

  // Guard /admin/* page routes and /api/admin/* API routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!token) {
      // Page routes: redirect to login
      if (pathname.startsWith("/admin")) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/admin/login";
        return NextResponse.redirect(loginUrl);
      }
      // API routes: return 401 JSON
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
