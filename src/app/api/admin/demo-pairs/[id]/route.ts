import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/demo-pairs/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const { id } = await params;
    const pairId = Number(id);
    if (isNaN(pairId)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }
    const pair = await prisma.demoPair.findUnique({ where: { id: pairId } });
    if (!pair) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json(pair);
  } catch (error) {
    console.error("Failed to fetch demo pair:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// PUT /api/admin/demo-pairs/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const { id } = await params;
    const pairId = Number(id);
    if (isNaN(pairId)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }
    const body = await request.json();
    const { photoUrl, characterUrl, order, isActive } = body;

    const pair = await prisma.demoPair.update({
      where: { id: pairId },
      data: {
        ...(photoUrl !== undefined && { photoUrl }),
        ...(characterUrl !== undefined && { characterUrl }),
        ...(order !== undefined && { order: Number(order) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    return NextResponse.json(pair);
  } catch (error) {
    console.error("Failed to update demo pair:", error);
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }
}

// DELETE /api/admin/demo-pairs/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const { id } = await params;
    const pairId = Number(id);
    if (isNaN(pairId)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }
    await prisma.demoPair.delete({ where: { id: pairId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete demo pair:", error);
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 });
  }
}
