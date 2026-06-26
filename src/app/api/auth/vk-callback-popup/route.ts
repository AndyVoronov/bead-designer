import { NextRequest, NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { prisma } from "@/lib/prisma";

const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function getCookieName(): string {
  const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL_INTERNAL || "";
  if (nextAuthUrl.startsWith("https://")) {
    return "__Secure-authjs.session-token";
  }
  return "authjs.session-token";
}

/**
 * VK ID popup callback.
 *
 * VK redirects here with ?code=...&device_id=...&state=...
 * We exchange code for tokens using VK ID endpoint (application/x-www-form-urlencoded),
 * extract user info from id_token JWT, create user, issue JWT cookie
 * using @auth/core/jwt.encode (same function NextAuth uses internally).
 * Then render HTML that tells opener via postMessage and closes.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const deviceId = searchParams.get("device_id");
    const state = searchParams.get("state");

    if (!code || !deviceId) {
      return new NextResponse("Missing code or device_id", { status: 400 });
    }

    const clientId = process.env.AUTH_VK_ID;
    const clientSecret = process.env.AUTH_VK_SECRET;
    const redirectUri = process.env.NEXTAUTH_URL
      ? process.env.NEXTAUTH_URL + "/api/auth/vk-callback-popup"
      : request.headers.get("origin") + "/api/auth/vk-callback-popup";

    if (!clientId || !clientSecret) {
      return new NextResponse("VK credentials not configured", { status: 500 });
    }

    // Read code_verifier from cookie (set by client before popup)
    const codeVerifier = request.cookies.get("vk_code_verifier")?.value || "";

    // Build form-urlencoded body for token exchange
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("device_id", deviceId);
    params.append("redirect_uri", redirectUri);
    if (codeVerifier) {
      params.append("code_verifier", codeVerifier);
    }

    // Exchange code for tokens at VK ID endpoint
    const tokenRes = await fetch("https://id.vk.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("VK ID token exchange failed:", tokenRes.status, errText);
      const origin = request.headers.get("origin") || "";
      return new NextResponse(
        '<html><body><script>window.opener.postMessage({type:"vk_login",error:"VK token exchange failed: ' + tokenRes.status + '"},window.opener.origin);window.close();</script></body></html>',
        { headers: { "Content-Type": "text/html" }, status: 200 }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("VK ID: no access_token in response", tokenData);
      const origin = request.headers.get("origin") || "";
      return new NextResponse(
        '<html><body><script>window.opener.postMessage({type:"vk_login",error:"No access token"},"' + origin + '");window.close();</script></body></html>',
        { headers: { "Content-Type": "text/html" }, status: 200 }
      );
    }

    // First: fetch user data from VK ID UserInfo API (id.vk.com)
    let vkUser: { user_id: string; first_name?: string; last_name?: string; picture?: string; email?: string } = {
      user_id: String(tokenData.user_id || ""),
    };

    if (accessToken) {
      try {
        const userInfoRes = await fetch("https://id.vk.com/oauth2/user_info", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userInfoRes.ok) {
          const info = await userInfoRes.json();
          console.log("[VK-popup] UserInfo response:", JSON.stringify(info));
          vkUser = {
            user_id: String(info.user_id || tokenData.user_id || ""),
            first_name: info.first_name || "",
            last_name: info.last_name || "",
            picture: info.avatar || "",
            email: info.email || "",
          };
        } else {
          console.error("[VK-popup] UserInfo failed:", userInfoRes.status);
        }
      } catch (e) {
        console.error("[VK-popup] UserInfo error:", e);
      }
    }

    // Fallback: decode id_token JWT if UserInfo didn't return data
    if (!vkUser.first_name && !vkUser.last_name && tokenData.id_token) {
      try {
        const parts = tokenData.id_token.split(".");
        if (parts.length === 3) {
          let payload = parts[1];
          while (payload.length % 4 !== 0) payload += "=";
          const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
          vkUser = {
            user_id: String(decoded.sub || tokenData.user_id || ""),
            first_name: decoded.first_name || decoded.given_name || "",
            last_name: decoded.last_name || decoded.family_name || "",
            picture: decoded.picture || decoded.photo || "",
            email: decoded.email || "",
          };
        }
      } catch (e) {
        console.error("[VK-popup] Failed to decode id_token:", e);
      }
    }

    const provider = "vkontakte";
    const providerId = vkUser.user_id;
    const name = [vkUser.first_name, vkUser.last_name].filter(Boolean).join(" ") || "VK User";
    const avatar = vkUser.picture || null;

    if (!providerId) {
      console.error("VK ID: no user_id", tokenData);
      const origin = request.headers.get("origin") || "";
      return new NextResponse(
        '<html><body><script>window.opener.postMessage({type:"vk_login",error:"No user ID in VK response"},"' + origin + '");window.close();</script></body></html>',
        { headers: { "Content-Type": "text/html" }, status: 200 }
      );
    }

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
          email: vkUser.email || null,
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

    // Use @auth/core/jwt.encode — same function NextAuth uses internally
    // This guarantees the JWE format and key derivation are identical
    const secret = process.env.AUTH_SECRET;
    const cookieName = getCookieName();

    const token = await encode({
      token: {
        sub: String(userId),
        userId: String(userId),
        name,
        picture: avatar,
        provider,
      },
      secret,
      salt: cookieName,
    });

    console.log("[VK-callback] Session token created for user:", userId, "cookie:", cookieName);

    // Return HTML that sets cookie, clears code_verifier, and notifies opener
    const origin = request.headers.get("origin") || "";
    const isSecure = request.url.startsWith("https") ? "; secure" : "";

    return new NextResponse(
      '<!DOCTYPE html>\n<html>\n<head><title>ВКонтакте — вход выполнен</title></head>\n<body>\n<script>\n' +
      'document.cookie = "' + cookieName + '=' + token + '; path=/; max-age=' + DEFAULT_MAX_AGE + '; samesite=lax' + isSecure + '";\n' +
      'document.cookie = "vk_code_verifier=; path=/; max-age=0";\n' +
      'window.opener.postMessage({ type: "vk_login" }, "' + origin + '");\n' +
      'window.close();\n' +
      '</script>\n</body>\n</html>',
      {
        headers: {
          "Content-Type": "text/html",
          "Set-Cookie": "vk_code_verifier=; Path=/; Max-Age=0; HttpOnly",
        },
      }
    );
  } catch (error) {
    console.error("VK ID callback error:", error);
    const origin = request.headers.get("origin") || "";
    return new NextResponse(
      '<!DOCTYPE html><html><body><script>window.opener.postMessage({type:"vk_login",error:"Internal server error"},"' + origin + '");window.close();</script></body></html>',
      { headers: { "Content-Type": "text/html" }, status: 200 }
    );
  }
}
