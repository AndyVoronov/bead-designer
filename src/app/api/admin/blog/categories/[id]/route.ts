import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

// PUT /api/admin/blog/categories/[id] — update category
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
    const { name, slug, description, order } = body;

    const existing = await prisma.blogCategory.findUnique({
      where: { id: categoryId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Категория не найдена" },
        { status: 404 }
      );
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.blogCategory.findUnique({
        where: { slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "Категория с таким slug уже существует" },
          { status: 409 }
        );
      }
    }

    const category = await prisma.blogCategory.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(slug !== undefined && { slug: slug.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to update blog category:", error);
    return NextResponse.json(
      { error: "Не удалось обновить категорию" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/blog/categories/[id] — delete category (nullify posts first)
export async function DELETE(
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

    const existing = await prisma.blogCategory.findUnique({
      where: { id: categoryId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Категория не найдена" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Set categoryId to null on all posts in this category
      await tx.blogPost.updateMany({
        where: { categoryId },
        data: { categoryId: null },
      });

      // Delete the category
      await tx.blogCategory.delete({
        where: { id: categoryId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete blog category:", error);
    return NextResponse.json(
      { error: "Не удалось удалить категорию" },
      { status: 500 }
    );
  }
}
