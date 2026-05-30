import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/blog — list published blog posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 12));
    const categorySlug = searchParams.get("category") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const search = searchParams.get("search") || undefined;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { status: "published" };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (tag) {
      where.tags = { some: { tag } };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          heroImage: true,
          status: true,
          readTime: true,
          metaTitle: true,
          metaDescription: true,
          ogImage: true,
          isPinned: true,
          views: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          relatedProductIds: true,
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
        content: null,
        tags: p.tags.map((t) => t.tag),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Failed to fetch blog posts:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить статьи" },
      { status: 500 }
    );
  }
}
