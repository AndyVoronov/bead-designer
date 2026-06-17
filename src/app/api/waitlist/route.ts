import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  // Rate limit: 3 requests per minute per IP
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`${ip}:waitlist`, 3, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { productId, email } = body;

    // Validate required fields
    if (!productId || !email) {
      return NextResponse.json(
        { error: "Укажите товар и email" },
        { status: 400 },
      );
    }

    // Validate email format
    const trimmedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Некорректный формат email" },
        { status: 400 },
      );
    }

    // Validate productId is a number
    const pid = Number(productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      return NextResponse.json(
        { error: "Некорректный ID товара" },
        { status: 400 },
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: pid },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Товар не найден" },
        { status: 404 },
      );
    }

    // Upsert: create or reset if already exists
    await prisma.waitlistEntry.upsert({
      where: {
        productId_email: {
          productId: pid,
          email: trimmedEmail,
        },
      },
      create: {
        productId: pid,
        email: trimmedEmail,
        notified: false,
      },
      update: {
        notified: false,
        createdAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: "Вы будете уведомлены о поступлении товара" },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 },
    );
  }
}
