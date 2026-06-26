import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/demo-pairs — ordered before/after pairs for /books try-demo
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const pairs = await prisma.demoPair.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json(pairs);
  } catch (error) {
    console.error("Failed to fetch demo pairs:", error);
    return NextResponse.json({ error: "Не удалось загрузить демо-пары" }, { status: 500 });
  }
}

// POST /api/admin/demo-pairs — create a demo pair
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const body = await request.json();
    const { photoUrl, characterUrl, order, isActive } = body;

    if (!photoUrl || !characterUrl) {
      return NextResponse.json(
        { error: "Нужны оба изображения (фото и персонаж)" },
        { status: 400 }
      );
    }

    const pair = await prisma.demoPair.create({
      data: {
        photoUrl,
        characterUrl,
        order: order !== undefined ? Number(order) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    return NextResponse.json(pair, { status: 201 });
  } catch (error) {
    console.error("Failed to create demo pair:", error);
    return NextResponse.json({ error: "Не удалось создать демо-пару" }, { status: 500 });
  }
}
