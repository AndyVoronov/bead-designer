import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";
import { generateSlug } from "@/lib/catalog-utils";

// PUT /api/admin/categories/[id] — update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const categoryId = Number(id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, slug, parentId, order } = body;

    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
    }

    const categorySlug = slug || (name ? generateSlug(name) : existing.slug);

    // Check slug uniqueness if changed
    if (categorySlug !== existing.slug) {
      const slugConflict = await prisma.category.findUnique({
        where: { slug: categorySlug },
      });
      if (slugConflict) {
        return NextResponse.json(
          { error: "Категория с таким slug уже существует" },
          { status: 409 }
        );
      }
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined || name ? { slug: categorySlug } : {}),
        ...(parentId !== undefined && {
          parentId: parentId ? Number(parentId) : null,
        }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: "Не удалось обновить категорию" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/categories/[id] — delete category (only if no products/children)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(_request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const categoryId = Number(id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { error: "Нельзя удалить категорию с товарами. Переместите товары в другую категорию." },
        { status: 400 }
      );
    }

    if (category._count.children > 0) {
      return NextResponse.json(
        { error: "Нельзя удалить категорию с подкатегориями. Сначала удалите подкатегории." },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { error: "Не удалось удалить категорию" },
      { status: 500 }
    );
  }
}
