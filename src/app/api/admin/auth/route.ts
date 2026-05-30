import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function timingSafeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "utf-8");
    const bBuf = Buffer.from(b, "utf-8");
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

function generateAdminToken(): string {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) {
    throw new Error("ADMIN_COOKIE_SECRET is not configured");
  }

  const timestamp = Date.now().toString(36);
  const payload = `${timestamp}.admin`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return `signed-${signature}.${payload}`;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per minute per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`admin-auth:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Слишком много попыток. Попробуйте через минуту." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await request.json();
    const { login, password, action } = body;

    // Logout: clear the cookie
    if (action === "logout") {
      const response = NextResponse.json({ success: true });
      response.cookies.set("admin_token", "", {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    // Login: verify login + password
    if (!login || !password) {
      return NextResponse.json(
        { error: "Введите логин и пароль" },
        { status: 400 }
      );
    }

    const adminLogin = process.env.ADMIN_LOGIN;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminLogin || !adminPassword) {
      console.error("ADMIN_LOGIN or ADMIN_PASSWORD environment variable is not set");
      return NextResponse.json(
        { error: "Ошибка конфигурации сервера" },
        { status: 500 }
      );
    }

    // Timing-safe comparison to prevent timing attacks
    const loginMatch = timingSafeEqual(login, adminLogin);
    const passwordMatch = timingSafeEqual(password, adminPassword);

    if (!loginMatch || !passwordMatch) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    // Success: set HMAC-signed cookie
    const token = generateAdminToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 86400, // 24 hours
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (err) {
    console.error("[admin/auth] Error parsing request:", err);
    return NextResponse.json(
      { error: "Некорректный запрос" },
      { status: 400 }
    );
  }
}
