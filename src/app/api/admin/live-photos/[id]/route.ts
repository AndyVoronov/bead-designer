import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/live-photos/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const { id } = await params;
    const photoId = Number(id);
    if (isNaN(photoId)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }
    const photo = await prisma.livePhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json(photo);
  } catch (error) {
    console.error("Failed to fetch live photo:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// PUT /api/admin/live-photos/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const { id } = await params;
    const photoId = Number(id);
    if (isNaN(photoId)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }
    const body = await request.json();
    const { url, order, isActive } = body;

    const photo = await prisma.livePhoto.update({
      where: { id: photoId },
      data: {
        ...(url !== undefined && { url }),
        ...(order !== undefined && { order: Number(order) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    return NextResponse.json(photo);
  } catch (error) {
    console.error("Failed to update live photo:", error);
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }
}

// DELETE /api/admin/live-photos/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const { id } = await params;
    const photoId = Number(id);
    if (isNaN(photoId)) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }
    await prisma.livePhoto.delete({ where: { id: photoId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete live photo:", error);
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 });
  }
}
