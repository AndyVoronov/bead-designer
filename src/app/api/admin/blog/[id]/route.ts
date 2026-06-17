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

// GET /api/admin/blog/[id] — single post with tags and images
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const postId = Number(id);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
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

    if (!post) {
      return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
    }

    return NextResponse.json({
      ...post,
      tags: post.tags.map((t) => t.tag),
    });
  } catch (error) {
    console.error("Failed to fetch blog post:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить статью" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/blog/[id] — update post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const postId = Number(id);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
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

    // Verify post exists
    const existing = await prisma.blogPost.findUnique({
      where: { id: postId },
      select: { id: true, slug: true, status: true, publishedAt: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.blogPost.findUnique({
        where: { slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "Статья с таким slug уже существует" },
          { status: 409 }
        );
      }
    }

    const finalSlug = slug || (title ? transliterateSlug(title) : existing.slug);
    const calculatedReadTime =
      readTime !== undefined
        ? Number(readTime)
        : content
          ? Math.max(1, Math.ceil(content.length / 1500))
          : undefined;

    // Auto-set publishedAt when status changes to published
    let finalPublishedAt =
      publishedAt !== undefined
        ? publishedAt
          ? new Date(publishedAt)
          : null
        : undefined;
    if (status === "published" && existing.status !== "published" && !existing.publishedAt) {
      finalPublishedAt = new Date();
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (slug !== undefined) updateData.slug = finalSlug;
    if (excerpt !== undefined) updateData.excerpt = excerpt?.trim() || null;
    if (content !== undefined) updateData.content = content;
    if (heroImage !== undefined) updateData.heroImage = heroImage || null;
    if (status !== undefined) updateData.status = status;
    if (categoryId !== undefined) updateData.categoryId = categoryId ? Number(categoryId) : null;
    if (authorId !== undefined) updateData.authorId = authorId ? Number(authorId) : null;
    if (finalPublishedAt !== undefined) updateData.publishedAt = finalPublishedAt;
    if (calculatedReadTime !== undefined) updateData.readTime = calculatedReadTime;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle?.trim() || null;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription?.trim() || null;
    if (ogImage !== undefined) updateData.ogImage = ogImage || null;
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned);
    if (relatedProductIds !== undefined) {
      updateData.relatedProductIds = Array.isArray(relatedProductIds)
        ? relatedProductIds.map(Number)
        : [];
    }

    // Handle tags: delete old + create new (requires transaction)
    if (tags !== undefined) {
      await prisma.$transaction(async (tx) => {
        await tx.blogPostTag.deleteMany({ where: { postId } });

        const cleanTags = tags
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0);

        if (cleanTags.length > 0) {
          updateData.tags = {
            create: cleanTags.map((tag: string) => ({ tag })),
          };
        }

        await tx.blogPost.update({
          where: { id: postId },
          data: updateData as Parameters<typeof tx.blogPost.update>[0]["data"],
        });
      });
    } else {
      await prisma.blogPost.update({
        where: { id: postId },
        data: updateData as Parameters<typeof prisma.blogPost.update>[0]["data"],
      });
    }

    // Fetch updated post
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
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
      ...post!,
      tags: post!.tags.map((t) => t.tag),
    });
  } catch (error) {
    console.error("Failed to update blog post:", error);
    return NextResponse.json(
      { error: "Не удалось обновить статью" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/blog/[id] — delete post (cascade removes tags, images, comments)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { id } = await params;
    const postId = Number(id);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Неверный ID" }, { status: 400 });
    }

    const existing = await prisma.blogPost.findUnique({
      where: { id: postId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
    }

    await prisma.blogPost.delete({
      where: { id: postId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete blog post:", error);
    return NextResponse.json(
      { error: "Не удалось удалить статью" },
      { status: 500 }
    );
  }
}
