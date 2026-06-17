import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/blog/categories — all blog categories with published post count
export async function GET() {
  try {
    const categories = await prisma.blogCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: {
            posts: {
              where: { status: "published" },
            },
          },
        },
      },
    });

    return NextResponse.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        order: c.order,
        postCount: c._count.posts,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch blog categories:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить категории" },
      { status: 500 }
    );
  }
}
