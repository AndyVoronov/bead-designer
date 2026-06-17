import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";
import { generateSlug } from "@/lib/catalog-utils";

// GET /api/admin/categories — all categories ordered
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить категории" },
      { status: 500 }
    );
  }
}

// POST /api/admin/categories — create category
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, parentId, order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Название обязательно" },
        { status: 400 }
      );
    }

    const categorySlug = slug || generateSlug(name);

    const existing = await prisma.category.findUnique({
      where: { slug: categorySlug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Категория с таким slug уже существует" },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: categorySlug,
        parentId: parentId ? Number(parentId) : null,
        order: order !== undefined ? Number(order) : 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Не удалось создать категорию" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/categories — batch reorder categories
export async function PUT(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "items должен быть массивом" },
        { status: 400 }
      );
    }

    // Update each category's order and parentId in a transaction
    await prisma.$transaction(
      items.map(
        (item: { id: number; order: number; parentId: number | null }) =>
          prisma.category.update({
            where: { id: item.id },
            data: {
              order: item.order,
              parentId: item.parentId,
            },
          })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder categories:", error);
    return NextResponse.json(
      { error: "Не удалось обновить порядок категорий" },
      { status: 500 }
    );
  }
}
