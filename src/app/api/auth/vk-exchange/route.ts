import { NextRequest, NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { prisma } from "@/lib/prisma";

/**
 * VK ID exchange endpoint.
 *
 * Called by the client after VKID.Auth.exchangeCode() succeeds.
 * Receives VK tokens, decodes id_token for user data,
 * creates/finds user in DB, issues a NextAuth session cookie
 * using @auth/core/jwt.encode (same function NextAuth uses internally).
 *
 * Cookie name matches NextAuth's convention:
 *   "__Secure-authjs.session-token" when NEXTAUTH_URL is HTTPS
 *   "authjs.session-token" otherwise
 */

const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function getCookieName(): string {
  const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL_INTERNAL || "";
  if (nextAuthUrl.startsWith("https://")) {
    return "__Secure-authjs.session-token";
  }
  return "authjs.session-token";
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.error("[VK] AUTH_SECRET not set");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const body = await request.json();
    const { access_token, user_id, id_token, vk_user } = body;

    console.log("[VK] Exchange request:", JSON.stringify({
      user_id,
      has_access_token: !!access_token,
      has_id_token: !!id_token,
      has_vk_user: !!vk_user,
    }));

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // Use client-provided VK user data (fetched from api.vk.com on client side)
    let name = "VK User";
    let avatar: string | null = null;
    let email: string | null = null;

    if (vk_user) {
      const firstName = vk_user.first_name || "";
      const lastName = vk_user.last_name || "";
      name = [firstName, lastName].filter(Boolean).join(" ") || "VK User";
      avatar = vk_user.photo_200 || vk_user.photo_100 || null;
      email = vk_user.email || null;
    }

    // Fallback: decode id_token JWT if available
    if (name === "VK User" && id_token) {
      try {
        const parts = id_token.split(".");
        if (parts.length === 3) {
          let payload = parts[1];
          while (payload.length % 4 !== 0) payload += "=";
          const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
          const firstName = decoded.first_name || decoded.given_name || "";
          const lastName = decoded.last_name || decoded.family_name || "";
          name = [firstName, lastName].filter(Boolean).join(" ") || "VK User";
          avatar = decoded.picture || decoded.photo || null;
          email = decoded.email || null;
        }
      } catch (e) {
        console.error("[VK] Failed to decode id_token:", e);
      }
    }

    const provider = "vkontakte";
    const providerId = String(user_id);

    // Find or create user
    const existingAccount = await prisma.account.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });

    let userId: number;

    if (existingAccount) {
      userId = existingAccount.userId;
      const updateData: { name: string; avatar: string | null; email?: string | null } = { name, avatar };
      if (email) updateData.email = email;
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    } else {
      const newUser = await prisma.user.create({
        data: {
          name,
          avatar,
          email,
          accounts: {
            create: {
              provider,
              providerId,
            },
          },
        },
      });
      userId = newUser.id;
    }

    console.log("[VK] Final user data:", JSON.stringify({ userId, name, avatar: avatar ? 'yes' : null, email }));

    // Build JWT payload matching NextAuth's JWT structure
    // jwt callback looks for token.userId, session callback reads it
    const cookieName = getCookieName();

    const token = await encode({
      token: {
        sub: String(userId),
        userId: String(userId),
        name,
        picture: avatar,
        email,
        provider,
      },
      secret,
      salt: cookieName,
    });

    console.log("[VK] Session token created for user:", userId, "cookie:", cookieName);

    // Set JWT cookie with NextAuth cookie name
    const response = NextResponse.json({ success: true, userId });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      path: "/",
      maxAge: DEFAULT_MAX_AGE,
      sameSite: "lax",
      secure: request.url.startsWith("https") || process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("[VK] Exchange error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
