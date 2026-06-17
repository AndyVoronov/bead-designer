import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit: 5 per minute per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`subscribe:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        { status: 429 }
      );
    }

    const { email, source } = await request.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Введите корректный email" },
        { status: 400 }
      );
    }

    const normalized = email.trim().toLowerCase();

    // Upsert: don't error on duplicate
    await prisma.subscriber.upsert({
      where: { email: normalized },
      create: { email: normalized, source: source || "footer" },
      update: { isActive: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to subscribe:", error);
    return NextResponse.json(
      { error: "Ошибка подписки" },
      { status: 500 }
    );
  }
}
