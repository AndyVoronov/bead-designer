import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "toy-designer-default-secret-change-in-production"
);

/**
 * VK ID authentication endpoint.
 *
 * Flow:
 * 1. VK ID SDK renders button, user authenticates
 * 2. SDK returns code + device_id via callback
 * 3. Frontend sends POST /api/auth/vkid with code + device_id
 * 4. We exchange code for access_token via VK ID API
 * 5. Fetch user info, create/link user, issue JWT, set cookie
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, device_id } = body;

    if (!code || !device_id) {
      return NextResponse.json(
        { error: "Missing code or device_id" },
        { status: 400 }
      );
    }

    const clientId = process.env.AUTH_VK_ID;
    const clientSecret = process.env.AUTH_VK_SECRET;
    const redirectUri = process.env.NEXTAUTH_URL
      ? process.env.NEXTAUTH_URL + "/api/auth/callback/vkontakte"
      : "https://5minutesofsilence.ru/api/auth/callback/vkontakte";

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "VK credentials not configured" },
        { status: 500 }
      );
    }

    // Exchange code for access_token
    const tokenRes = await fetch("https://id.vk.com/oauth2/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        device_id,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("VK ID token exchange failed:", errText);
      return NextResponse.json(
        { error: "VK token exchange failed" },
        { status: 401 }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("VK ID: no access_token in response", tokenData);
      return NextResponse.json(
        { error: "No access token received" },
        { status: 401 }
      );
    }

    // Fetch user info
    const userInfoRes = await fetch("https://id.vk.com/oauth2/user_info", {
      headers: { Authorization: "Bearer " + accessToken },
    });

    if (!userInfoRes.ok) {
      console.error("VK ID user_info failed:", await userInfoRes.text());
      return NextResponse.json(
        { error: "Failed to fetch VK user info" },
        { status: 401 }
      );
    }

    const vkUser = await userInfoRes.json();
    const provider = "vkontakte";
    const providerId = String(vkUser.user_id);
    const name = [vkUser.first_name, vkUser.last_name].filter(Boolean).join(" ") || null;
    const avatar = vkUser.avatar || null;

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
    } else {
      const newUser = await prisma.user.create({
        data: {
          name,
          avatar,
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

    // Issue JWT compatible with NextAuth
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

    const response = NextResponse.json({ success: true, userId });
    response.cookies.set("authjs.session-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("VK ID auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
