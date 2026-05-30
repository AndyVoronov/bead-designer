import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/blog/[slug] — single published post by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const post = await prisma.blogPost.findFirst({
      where: { slug, status: "published" },
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
        images: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
    }

    // Check cookie for view tracking
    const viewedCookieName = `blog_viewed_${slug}`;
    const cookieHeader = request.headers.get("cookie") || "";
    const alreadyViewed = cookieHeader
      .split(";")
      .some((c) => c.trim().startsWith(`${viewedCookieName}=`));

    if (!alreadyViewed) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { views: { increment: 1 } },
      });
    }

    // Fetch related posts: 3 from same category, excluding current
    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        status: "published",
        id: { not: post.id },
        ...(post.categoryId
          ? { categoryId: post.categoryId }
          : {}),
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        heroImage: true,
        readTime: true,
        publishedAt: true,
        views: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          select: { tag: true },
        },
      },
    });

    // If not enough from same category, fill with random posts
    if (relatedPosts.length < 3 && post.categoryId) {
      const remaining = await prisma.blogPost.findMany({
        where: {
          status: "published",
          id: {
            not: post.id,
            notIn: relatedPosts.map((p) => p.id),
          },
          categoryId: { not: post.categoryId },
        },
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        take: 3 - relatedPosts.length,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          heroImage: true,
          readTime: true,
          publishedAt: true,
          views: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
          tags: {
            select: { tag: true },
          },
        },
      });
      relatedPosts.push(...remaining);
    }

    const response = NextResponse.json({
      ...post,
      tags: post.tags.map((t) => t.tag),
      relatedPosts: relatedPosts.map((rp) => ({
        ...rp,
        tags: rp.tags.map((t) => t.tag),
      })),
    });

    // Set viewed cookie for 24h
    response.cookies.set(viewedCookieName, "1", {
      maxAge: 86400,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("Failed to fetch blog post:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить статью" },
      { status: 500 }
    );
  }
}
