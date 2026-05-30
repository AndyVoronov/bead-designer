import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// PUT /api/admin/badges/[id] — update badge
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

    const existing = await prisma.badge.findUnique({
      where: { id: badgeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Бейдж не найден" }, { status: 404 });
    }

    const body = await request.json();
    const { label, textColor, bgColor, order } = body;

    // Check label uniqueness if changed
    if (label && label !== existing.label) {
      const labelConflict = await prisma.badge.findUnique({
        where: { label },
      });
      if (labelConflict) {
        return NextResponse.json(
          { error: "Бейдж с таким названием уже существует" },
          { status: 409 }
        );
      }
    }

    const badge = await prisma.badge.update({
      where: { id: badgeId },
      data: {
        ...(label !== undefined && { label }),
        ...(textColor !== undefined && { textColor }),
        ...(bgColor !== undefined && { bgColor }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });

    return NextResponse.json(badge);
  } catch (error) {
    console.error("Failed to update badge:", error);
    return NextResponse.json(
      { error: "Не удалось обновить бейдж" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/badges/[id] — delete badge
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(_request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const badgeId = Number(id);
    if (isNaN(badgeId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const existing = await prisma.badge.findUnique({
      where: { id: badgeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Бейдж не найден" }, { status: 404 });
    }

    await prisma.badge.delete({
      where: { id: badgeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete badge:", error);
    return NextResponse.json(
      { error: "Не удалось удалить бейдж" },
      { status: 500 }
    );
  }
}
