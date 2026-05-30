import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "toy-designer-default-secret-change-in-production"
);

/**
 * Verify Telegram Login Widget data hash.
 * https://core.telegram.org/widgets/login#checking-authorization
 *
 * The hash is HMAC-SHA256 of the data-check-string using BOT_TOKEN as key.
 * data-check-string = sorted key=value pairs (excluding hash), joined with \n
 */
function verifyTelegramHash(data: Record<string, unknown>): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN not set — cannot verify Telegram auth");
    return false;
  }

  const hash = data.hash;
  if (!hash || typeof hash !== "string") return false;

  // Build data-check-string: sort all fields except 'hash', join with \n
  const dataCheckString = Object.keys(data)
    .filter((key) => key !== "hash" && data[key] != null)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");

  // Compute HMAC-SHA256
  const secretKey = createHmac("sha256", botToken).update("WebAppData").digest();
  const computedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Timing-safe comparison
  try {
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(computedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

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
    const { id, first_name, last_name, username, photo_url, hash, ...restAuthData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing Telegram user id" },
        { status: 400 }
      );
    }

    // Verify Telegram hash to prevent impersonation
    if (hash) {
      const authData = { id, first_name, last_name, username, photo_url, ...restAuthData, hash };
      if (!verifyTelegramHash(authData)) {
        return NextResponse.json(
          { error: "Invalid Telegram authentication" },
          { status: 401 }
        );
      }
    } else {
      // No hash provided — reject in production
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Missing authentication hash" },
          { status: 401 }
        );
      }
      console.warn("Telegram auth without hash — allowed in development only");
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
        data: { name, avatar, telegramChatId: String(id) },
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
          telegramChatId: String(id),
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
