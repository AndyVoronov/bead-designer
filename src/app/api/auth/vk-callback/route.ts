import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "toy-designer-default-secret-change-in-production"
);
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://5minutesofsilence.ru";

/**
 * VK ID SDK callback — Redirect mode.
 *
 * SDK opens VK auth page. After authorization, VK redirects here with:
 *   ?code=xxx&device_id=xxx&state=xxx
 *
 * The SDK stores codeVerifier in cookie "vkid_sdk:codeVerifier".
 * We read it from the request, then exchange code+verifier for tokens
 * at https://id.vk.ru/oauth2/auth (the actual VK ID token endpoint).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const deviceId = searchParams.get("device_id");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    function redirectWithError(msg: string) {
      return NextResponse.redirect(BASE_URL + "/?error=VKAuthError&message=" + encodeURIComponent(msg));
    }

    if (error) {
      console.error("[VK] Auth error:", error, errorDescription);
      return redirectWithError(errorDescription || error);
    }

    if (!code) {
      return redirectWithError("No authorization code received");
    }

    // Read code_verifier from SDK cookie
    const codeVerifier = readVkCookie(request, "codeVerifier");
    const sdkState = readVkCookie(request, "state");
    console.log("[VK] Callback received:", { code: code.slice(0, 8) + "...", deviceId, state, hasVerifier: !!codeVerifier, sdkState });

    const clientId = process.env.AUTH_VK_ID || "54631745";
    const redirectUri = BASE_URL + "/api/auth/vk-callback";

    // Build token exchange request
    // VK ID endpoint: POST https://id.vk.ru/oauth2/auth?<query_params>
    // Body: code=<auth_code>
    const queryParams = new URLSearchParams({
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier || "",
      state: sdkState || state || "",
      device_id: deviceId || "",
    });

    console.log("[VK] Exchanging code at: https://id.vk.ru/oauth2/auth");

    const tokenRes = await fetch(
      "https://id.vk.ru/oauth2/auth?" + queryParams.toString(),
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code: code }).toString(),
      }
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[VK] Token exchange failed:", tokenRes.status, errText);
      return redirectWithError("Token exchange failed: " + errText.slice(0, 200));
    }

    const tokenData = await tokenRes.json();
    console.log("[VK] Token exchange OK, user_id:", tokenData.user_id, "has_id_token:", !!tokenData.id_token);

    // Extract user data from id_token JWT
    let name = "VK User";
    let avatar: string | null = null;
    let email: string | null = null;

    if (tokenData.id_token) {
      try {
        const parts = tokenData.id_token.split(".");
        if (parts.length === 3) {
          let payload = parts[1];
          while (payload.length % 4 !== 0) payload += "=";
          const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
          console.log("[VK] id_token payload:", JSON.stringify(decoded));
          const firstName = decoded.first_name || decoded.given_name || "";
          const lastName = decoded.last_name || decoded.family_name || "";
          name = [firstName, lastName].filter(Boolean).join(" ") || "VK User";
          avatar = decoded.picture || decoded.photo || decoded.avatar || null;
          email = decoded.email || null;
        }
      } catch (e) {
        console.error("[VK] Failed to decode id_token:", e);
      }
    }

    const provider = "vkontakte";
    const providerId = String(tokenData.user_id);

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
            create: { provider, providerId },
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

    // Redirect to home with JWT cookie
    const response = NextResponse.redirect(BASE_URL + "/");
    response.cookies.set("authjs.session-token", token, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
      secure: true,
    });

    return response;
  } catch (error) {
    console.error("[VK] Callback error:", error);
    return NextResponse.redirect(BASE_URL + "/?error=VKAuthError&message=" + encodeURIComponent("Internal error"));
  }
}

/** Read a vkid_sdk cookie value */
function readVkCookie(request: NextRequest, key: string): string {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp("(?:^|;\\s*)vkid_sdk:" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : "";
}
