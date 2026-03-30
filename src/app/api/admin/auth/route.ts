import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, action } = body;

    // Logout: clear the cookie
    if (action === "logout") {
      const response = NextResponse.json({ success: true });
      response.cookies.set("admin_token", "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    // Login: verify password
    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("ADMIN_PASSWORD environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Success: set the cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_token", "authenticated", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
