import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/trust-badges — all trust badges ordered
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const badges = await prisma.trustBadge.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json(badges);
  } catch (error) {
    console.error("Failed to fetch trust badges:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить сигналы доверия" },
      { status: 500 }
    );
  }
}

// POST /api/admin/trust-badges — create trust badge
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { label, icon, description, order, isActive } = body;

    if (!label) {
      return NextResponse.json(
        { error: "Название обязательно" },
        { status: 400 }
      );
    }

    if (!icon) {
      return NextResponse.json(
        { error: "Иконка обязательна" },
        { status: 400 }
      );
    }

    const badge = await prisma.trustBadge.create({
      data: {
        label,
        icon,
        description: description || null,
        order: order !== undefined ? Number(order) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json(badge, { status: 201 });
  } catch (error) {
    console.error("Failed to create trust badge:", error);
    return NextResponse.json(
      { error: "Не удалось создать сигнал доверия" },
      { status: 500 }
    );
  }
}
