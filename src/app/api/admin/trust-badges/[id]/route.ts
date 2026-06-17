import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/trust-badges/[id] — single trust badge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const badgeId = Number(id);
    if (isNaN(badgeId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const badge = await prisma.trustBadge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      return NextResponse.json({ error: "Сигнал доверия не найден" }, { status: 404 });
    }

    return NextResponse.json(badge);
  } catch (error) {
    console.error("Failed to fetch trust badge:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить сигнал доверия" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/trust-badges/[id] — update trust badge
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const badgeId = Number(id);
    if (isNaN(badgeId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const existing = await prisma.trustBadge.findUnique({
      where: { id: badgeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Сигнал доверия не найден" }, { status: 404 });
    }

    const body = await request.json();
    const { label, icon, description, order, isActive } = body;

    const badge = await prisma.trustBadge.update({
      where: { id: badgeId },
      data: {
        ...(label !== undefined && { label }),
        ...(icon !== undefined && { icon }),
        ...(description !== undefined && { description: description || null }),
        ...(order !== undefined && { order: Number(order) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json(badge);
  } catch (error) {
    console.error("Failed to update trust badge:", error);
    return NextResponse.json(
      { error: "Не удалось обновить сигнал доверия" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/trust-badges/[id] — delete trust badge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const badgeId = Number(id);
    if (isNaN(badgeId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const existing = await prisma.trustBadge.findUnique({
      where: { id: badgeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Сигнал доверия не найден" }, { status: 404 });
    }

    await prisma.trustBadge.delete({
      where: { id: badgeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete trust badge:", error);
    return NextResponse.json(
      { error: "Не удалось удалить сигнал доверия" },
      { status: 500 }
    );
  }
}
