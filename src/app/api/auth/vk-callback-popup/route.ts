import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "toy-designer-default-secret-change-in-production"
);

/**
 * VK ID popup callback.
 *
 * VK redirects here with ?code=...&device_id=...&state=...
 * We exchange code for tokens using VK ID endpoint (application/x-www-form-urlencoded),
 * extract user info from id_token JWT, create user, issue JWT cookie.
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

    // Exchange code for tokens at VK ID endpoint (NOT access_token, and NOT JSON)
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

    // Extract user info from id_token JWT (VK ID doesn't have separate user_info endpoint)
    let vkUser: { user_id: string; first_name?: string; last_name?: string; picture?: string; email?: string };

    if (tokenData.id_token) {
      // Decode JWT payload (no verification needed — VK signed it)
      const parts = tokenData.id_token.split(".");
      if (parts.length === 3) {
        let payload = parts[1];
        // Add base64 padding
        while (payload.length % 4 !== 0) payload += "=";
        const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
        vkUser = {
          user_id: String(decoded.sub || tokenData.user_id || ""),
          first_name: decoded.first_name || decoded.given_name || "",
          last_name: decoded.last_name || decoded.family_name || "",
          picture: decoded.picture || decoded.photo || "",
          email: decoded.email || "",
        };
      } else {
        vkUser = { user_id: String(tokenData.user_id || ""), first_name: "", last_name: "", picture: "", email: "" };
      }
    } else {
      // Fallback: use user_id from token response
      vkUser = {
        user_id: String(tokenData.user_id || ""),
        first_name: "",
        last_name: "",
        picture: "",
        email: "",
      };
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

    // Return HTML that sets cookie, clears code_verifier, and notifies opener
    const origin = request.headers.get("origin") || "";

    return new NextResponse(
      '<!DOCTYPE html>\n<html>\n<head><title>ВКонтакте — вход выполнен</title></head>\n<body>\n<script>\n' +
      'document.cookie = "authjs.session-token=' + token + '; path=/; max-age=' + (30 * 24 * 60 * 60) + '; samesite=lax' + (request.url.startsWith("https") ? "; secure" : "") + '";\n' +
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
