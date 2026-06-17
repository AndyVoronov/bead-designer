import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

// GET /api/admin/care-guides — all care guides with items
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const guides = await prisma.careGuide.findMany({
      include: {
        items: { orderBy: { order: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { categoryId: "asc" },
    });

    return NextResponse.json(guides);
  } catch (error) {
    console.error("Failed to fetch care guides:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить инструкции" },
      { status: 500 }
    );
  }
}

// POST /api/admin/care-guides — create or update care guide for a category
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId, title, subtitle, warning, items } = body;

    if (!categoryId || !title) {
      return NextResponse.json(
        { error: "Категория и название обязательны" },
        { status: 400 }
      );
    }

    // Upsert guide
    const guide = await prisma.careGuide.upsert({
      where: { categoryId: Number(categoryId) },
      create: {
        categoryId: Number(categoryId),
        title,
        subtitle: subtitle || null,
        warning: warning || null,
      },
      update: {
        title,
        subtitle: subtitle || null,
        warning: warning || null,
      },
      include: { items: true },
    });

    // Delete old items and create new ones
    if (guide.items.length > 0) {
      await prisma.careGuideItem.deleteMany({
        where: { guideId: guide.id },
      });
    }

    if (items && items.length > 0) {
      await prisma.careGuideItem.createMany({
        data: items.map((item: { icon: string; text: string; order?: number }, idx: number) => ({
          guideId: guide.id,
          icon: item.icon,
          text: item.text,
          order: item.order !== undefined ? item.order : idx,
        })),
      });
    }

    const result = await prisma.careGuide.findUnique({
      where: { id: guide.id },
      include: {
        items: { orderBy: { order: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to save care guide:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить инструкцию" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/care-guides — delete care guide by categoryId (query param)
export async function DELETE(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    if (!categoryId) {
      return NextResponse.json({ error: "categoryId обязателен" }, { status: 400 });
    }

    await prisma.careGuide.delete({
      where: { categoryId: Number(categoryId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete care guide:", error);
    return NextResponse.json(
      { error: "Не удалось удалить инструкцию" },
      { status: 500 }
    );
  }
}
