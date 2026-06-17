import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/blog/comments?postId=X — approved comments for a post
export async function GET(request: NextRequest) {
  try {
    const postId = request.nextUrl.searchParams.get("postId");
    if (!postId) {
      return NextResponse.json(
        { error: "postId обязателен" },
        { status: 400 }
      );
    }

    const postIdNum = Number(postId);
    if (isNaN(postIdNum) || postIdNum < 1) {
      return NextResponse.json(
        { error: "Некорректный ID статьи" },
        { status: 400 }
      );
    }

    const comments = await prisma.blogComment.findMany({
      where: {
        postId: postIdNum,
        isApproved: true,
        parentId: null, // top-level only
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
        replies: {
          where: { isApproved: true },
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить комментарии" },
      { status: 500 }
    );
  }
}

// POST /api/blog/comments — submit a comment
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 comments per minute
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`blog-comment:${clientIp}`, 5, 60000)) {
      return NextResponse.json(
        { error: "Слишком много комментариев. Подождите минуту." },
        { status: 429 }
      );
    }

    const session = await auth();
    const body = await request.json();
    const { postId, text, parentId, authorName, authorEmail } = body;

    // Validate required fields
    if (!postId || !text) {
      return NextResponse.json(
        { error: "postId и текст комментария обязательны" },
        { status: 400 }
      );
    }

    const postIdNum = Number(postId);
    if (isNaN(postIdNum) || postIdNum < 1) {
      return NextResponse.json(
        { error: "Некорректный ID статьи" },
        { status: 400 }
      );
    }

    const trimmedText = typeof text === "string" ? text.trim() : "";
    if (trimmedText.length === 0 || trimmedText.length > 2000) {
      return NextResponse.json(
        { error: "Текст комментария должен быть от 1 до 2000 символов" },
        { status: 400 }
      );
    }

    // Verify post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: postIdNum },
      select: { id: true, status: true },
    });
    if (!post || post.status !== "published") {
      return NextResponse.json(
        { error: "Статья не найдена" },
        { status: 404 }
      );
    }

    // Validate parentId if provided
    if (parentId) {
      const parentComment = await prisma.blogComment.findUnique({
        where: { id: Number(parentId) },
        select: { id: true, postId: true },
      });
      if (!parentComment || parentComment.postId !== postIdNum) {
        return NextResponse.json(
          { error: "Родительский комментарий не найден" },
          { status: 400 }
        );
      }
    }

    let userId: number | null = null;
    let finalAuthorName = authorName?.trim();
    let finalAuthorEmail = authorEmail?.trim() || null;

    if (session?.user?.id) {
      userId = Number(session.user.id);
      finalAuthorName =
        session.user.name?.trim() ||
        session.user.email?.split("@")[0] ||
        "Аноним";
    } else {
      // Guest: require authorName
      if (!finalAuthorName) {
        return NextResponse.json(
          { error: "Укажите ваше имя" },
          { status: 400 }
        );
      }
      // Validate guest name length
      if (finalAuthorName.length > 100) {
        return NextResponse.json(
          { error: "Имя слишком длинное (максимум 100 символов)" },
          { status: 400 }
        );
      }
      // Validate guest email format if provided
      if (finalAuthorEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(finalAuthorEmail)) {
          return NextResponse.json(
            { error: "Некорректный формат email" },
            { status: 400 }
          );
        }
      }
    }

    const comment = await prisma.blogComment.create({
      data: {
        text: trimmedText,
        authorName: finalAuthorName!,
        authorEmail: finalAuthorEmail,
        postId: postIdNum,
        parentId: parentId ? Number(parentId) : null,
        userId,
        isApproved: !!userId, // auto-approve for logged-in users
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: "Не удалось добавить комментарий" },
      { status: 500 }
    );
  }
}
