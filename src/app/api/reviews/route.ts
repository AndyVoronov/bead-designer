import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  const body = await request.json();
  const { rating, text, categoryId, productId } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be 1–5" }, { status: 400 });
  }
  if (!text || typeof text !== "string" || text.trim().length < 5) {
    return NextResponse.json({ error: "text must be at least 5 characters" }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: "text must be under 1000 characters" }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  const authorName =
    session.user.name?.trim() || session.user.email?.split("@")[0] || "Аноним";

  const review = await prisma.review.create({
    data: {
      userId,
      authorName,
      rating,
      text: text.trim(),
      isApproved: false,
      categoryId: Number(categoryId),
      productId: productId ? Number(productId) : null,
    },
  });

  return NextResponse.json(review, { status: 201 });
}

/**
 * GET /api/reviews
 * Query params:
 *   - categoryId  — required, filter reviews by category
 *   - productId   — optional, filter further by specific product
 *   - limit       — optional, default 20
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const productId = searchParams.get("productId");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  if (!categoryId) {
    // Stats mode — for aggregate rating JSON-LD
    const stats = searchParams.get("stats");
    if (stats) {
      const agg = await prisma.review.aggregate({
        where: { isApproved: true },
        _count: true,
        _avg: { rating: true },
      });
      return NextResponse.json({
        count: agg._count,
        avg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      });
    }

    // Landing page: return all approved reviews (no category filter)
    const reviews = await prisma.review.findMany({
      where: { isApproved: true },
      select: {
        id: true,
        authorName: true,
        rating: true,
        text: true,
        createdAt: true,
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(reviews);
  }

  // Category page: filter by categoryId
  const where: Record<string, unknown> = {
    isApproved: true,
    categoryId: Number(categoryId),
  };
  if (productId) {
    where.productId = Number(productId);
  }

  const reviews = await prisma.review.findMany({
    where,
    select: {
      id: true,
      authorName: true,
      rating: true,
      text: true,
      createdAt: true,
      product: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(reviews);
}
