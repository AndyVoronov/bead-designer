import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "toy-designer-default-secret-change-in-production"
);

/**
 * Telegram Login Widget authentication endpoint.
 *
 * Flow:
 * 1. User clicks "Login via Telegram" in LoginModal
 * 2. Opens Telegram Login Widget popup
 * 3. Widget sends user data via postMessage to parent
 * 4. Parent forwards to POST /api/auth/telegram
 * 5. We create/link user, issue JWT, set cookie
 *
 * The widget is loaded from https://telegram.org/js/telegram-widget.js
 * with data-bot-name, data-auth-url, data-request-access="write"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, first_name, last_name, username, photo_url } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing Telegram user id" },
        { status: 400 }
      );
    }

    const provider = "telegram";
    const providerId = String(id);
    const name = [first_name, last_name].filter(Boolean).join(" ") || username || null;
    const avatar = photo_url || null;

    // Find existing account
    const existingAccount = await prisma.account.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });

    let userId: number;

    if (existingAccount) {
      userId = existingAccount.userId;
      await prisma.user.update({
        where: { id: userId },
        data: { name, avatar },
      });
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { accountId: username },
      });
    } else {
      const newUser = await prisma.user.create({
        data: {
          name,
          avatar,
          accounts: {
            create: {
              provider,
              providerId,
              accountId: username,
            },
          },
        },
      });
      userId = newUser.id;
    }

    // Issue JWT compatible with NextAuth
    const token = await new SignJWT({
      sub: String(userId),
      name,
      picture: avatar,
      provider,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(AUTH_SECRET);

    // Set cookie (same name as NextAuth session cookie)
    const response = NextResponse.json({ success: true, userId });
    response.cookies.set("authjs.session-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
