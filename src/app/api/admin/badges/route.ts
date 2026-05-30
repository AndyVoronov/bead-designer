import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/badges — all badges ordered
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const badges = await prisma.badge.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json(badges);
  } catch (error) {
    console.error("Failed to fetch badges:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить бейджи" },
      { status: 500 }
    );
  }
}

// POST /api/admin/badges — create badge
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { label, textColor, bgColor, order } = body;

    if (!label) {
      return NextResponse.json(
        { error: "Название бейджа обязательно" },
        { status: 400 }
      );
    }

    const existing = await prisma.badge.findUnique({
      where: { label },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Бейдж с таким названием уже существует" },
        { status: 409 }
      );
    }

    const badge = await prisma.badge.create({
      data: {
        label,
        textColor: textColor || "#ffffff",
        bgColor: bgColor || "#000000",
        order: order !== undefined ? Number(order) : 0,
      },
    });

    return NextResponse.json(badge, { status: 201 });
  } catch (error) {
    console.error("Failed to create badge:", error);
    return NextResponse.json(
      { error: "Не удалось создать бейдж" },
      { status: 500 }
    );
  }
}
