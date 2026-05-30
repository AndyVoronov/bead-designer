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

// GET /api/admin/blog — list all posts (any status)
export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const categoryId = searchParams.get("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          author: {
            select: { id: true, name: true, avatar: true },
          },
          tags: {
            select: { tag: true },
          },
          _count: {
            select: { comments: true },
          },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      posts: posts.map((p) => ({
        ...p,
        tags: p.tags.map((t) => t.tag),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Failed to fetch admin blog posts:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить статьи" },
      { status: 500 }
    );
  }
}

// POST /api/admin/blog — create post
export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      slug,
      excerpt,
      content,
      heroImage,
      status,
      categoryId,
      authorId,
      publishedAt,
      readTime,
      metaTitle,
      metaDescription,
      ogImage,
      isPinned,
      tags,
      relatedProductIds,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Название и содержание обязательны" },
        { status: 400 }
      );
    }

    const postSlug = slug || transliterateSlug(title);

    // Check slug uniqueness
    const existing = await prisma.blogPost.findUnique({
      where: { slug: postSlug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Статья с таким slug уже существует" },
        { status: 409 }
      );
    }

    const calculatedReadTime = readTime || Math.max(1, Math.ceil(content.length / 1500));
    const finalPublishedAt =
      status === "published" && !publishedAt ? new Date() : publishedAt
        ? new Date(publishedAt)
        : null;

    const post = await prisma.blogPost.create({
      data: {
        title: title.trim(),
        slug: postSlug,
        excerpt: excerpt?.trim() || null,
        content,
        heroImage: heroImage || null,
        status: status || "draft",
        categoryId: categoryId ? Number(categoryId) : null,
        authorId: authorId ? Number(authorId) : null,
        publishedAt: finalPublishedAt,
        readTime: Number(calculatedReadTime),
        metaTitle: metaTitle?.trim() || null,
        metaDescription: metaDescription?.trim() || null,
        ogImage: ogImage || null,
        isPinned: Boolean(isPinned),
        relatedProductIds: Array.isArray(relatedProductIds)
          ? relatedProductIds.map(Number)
          : [],
        ...(Array.isArray(tags) && tags.length > 0
          ? {
              tags: {
                create: tags
                  .map((tag: string) => tag.trim())
                  .filter((tag: string) => tag.length > 0)
                  .map((tag: string) => ({ tag })),
              },
            }
          : {}),
      },
      include: {
        category: true,
        author: {
          select: { id: true, name: true, avatar: true },
        },
        tags: {
          select: { tag: true },
        },
        images: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    return NextResponse.json({
      ...post,
      tags: (post as unknown as { tags: { tag: string }[] }).tags.map((t) => t.tag),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create blog post:", error);
    return NextResponse.json(
      { error: "Не удалось создать статью" },
      { status: 500 }
    );
  }
}
