import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/live-photos — ordered photos for /books "Живые эмоции"
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const photos = await prisma.livePhoto.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json(photos);
  } catch (error) {
    console.error("Failed to fetch live photos:", error);
    return NextResponse.json({ error: "Не удалось загрузить фото" }, { status: 500 });
  }
}

// POST /api/admin/live-photos — add a photo
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const body = await request.json();
    const { url, order, isActive } = body;

    if (!url) {
      return NextResponse.json({ error: "URL изображения обязателен" }, { status: 400 });
    }

    const photo = await prisma.livePhoto.create({
      data: {
        url,
        order: order !== undefined ? Number(order) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Failed to create live photo:", error);
    return NextResponse.json({ error: "Не удалось добавить фото" }, { status: 500 });
  }
}
