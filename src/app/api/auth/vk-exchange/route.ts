import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "toy-designer-default-secret-change-in-production"
);

/**
 * VK ID exchange endpoint.
 *
 * Called by the client after VKID.Auth.exchangeCode() succeeds.
 * Receives VK tokens, decodes id_token for user data,
 * creates/finds user in DB, issues JWT cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, user_id, id_token } = body;

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // Extract user data from id_token JWT if available
    let name = "VK User";
    let avatar: string | null = null;
    let email: string | null = null;

    if (id_token) {
      try {
        const parts = id_token.split(".");
        if (parts.length === 3) {
          let payload = parts[1];
          // Add base64 padding
          while (payload.length % 4 !== 0) payload += "=";
          const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
          const firstName = decoded.first_name || decoded.given_name || "";
          const lastName = decoded.last_name || decoded.family_name || "";
          name = [firstName, lastName].filter(Boolean).join(" ") || "VK User";
          avatar = decoded.picture || decoded.photo || null;
          email = decoded.email || null;
        }
      } catch (e) {
        console.error("Failed to decode VK id_token:", e);
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
      await prisma.user.update({
        where: { id: userId },
        data: { name, avatar },
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

    // Issue JWT
    const token = await new SignJWT({
      sub: String(userId),
      name,
      picture: avatar,
      provider,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(AUTH_SECRET);

    // Set JWT cookie
    const response = NextResponse.json({ success: true, userId });

    response.cookies.set("authjs.session-token", token, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: "lax",
      secure: request.url.startsWith("https"),
    });

    return response;
  } catch (error) {
    console.error("VK exchange error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
