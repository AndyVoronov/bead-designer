import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";

// ── Transliteration helper ──
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterateSlug(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] || ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

// GET /api/admin/blog/categories — all categories with post count
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const categories = await prisma.blogCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch blog categories:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить категории" },
      { status: 500 }
    );
  }
}

// POST /api/admin/blog/categories — create category
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, description, order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Название обязательно" },
        { status: 400 }
      );
    }

    const categorySlug = slug || transliterateSlug(name);

    const existing = await prisma.blogCategory.findUnique({
      where: { slug: categorySlug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Категория с таким slug уже существует" },
        { status: 409 }
      );
    }

    const category = await prisma.blogCategory.create({
      data: {
        name: name.trim(),
        slug: categorySlug,
        description: description?.trim() || null,
        order: order !== undefined ? Number(order) : 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create blog category:", error);
    return NextResponse.json(
      { error: "Не удалось создать категорию" },
      { status: 500 }
    );
  }
}
