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
  const { rating, text } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be 1–5" }, { status: 400 });
  }
  if (!text || typeof text !== "string" || text.trim().length < 5) {
    return NextResponse.json({ error: "text must be at least 5 characters" }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: "text must be under 1000 characters" }, { status: 400 });
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
    },
  });

  return NextResponse.json(review, { status: 201 });
}

/** GET /api/reviews — return approved reviews for the landing page */
export async function GET() {
  const reviews = await prisma.review.findMany({
    where: { isApproved: true },
    select: {
      id: true,
      authorName: true,
      rating: true,
      text: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(reviews);
}
